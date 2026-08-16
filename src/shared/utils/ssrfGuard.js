// SSRF guard: block internal/private/metadata targets for server-side fetch.

const BLOCKED_HOSTNAMES = new Set(["localhost", "ip6-localhost", "ip6-loopback"]);
const BLOCKED_SUFFIXES = [".internal", ".local", ".localhost"];

// Parse dotted IPv4 to 32-bit integer, or null if not a valid IPv4 literal.
function ipv4ToInt(host) {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

// Private/reserved IPv4 ranges as [startInt, maskBits].
const BLOCKED_V4_RANGES = [
  [ipv4ToInt("0.0.0.0"), 8],
  [ipv4ToInt("10.0.0.0"), 8],
  [ipv4ToInt("127.0.0.0"), 8],
  [ipv4ToInt("169.254.0.0"), 16],
  [ipv4ToInt("172.16.0.0"), 12],
  [ipv4ToInt("192.168.0.0"), 16],
];

function isBlockedIpv4(host) {
  const ip = ipv4ToInt(host);
  if (ip === null) return false;
  return BLOCKED_V4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ip & mask) === (base & mask);
  });
}

// Expand an IPv6 literal to its 16 bytes, or null if it is not one.
//
// Matching on the text is not enough: WHATWG URL canonicalizes an embedded
// dotted quad to hextets, so `new URL("http://[::ffff:127.0.0.1]")` reports its
// hostname as `[::ffff:7f00:1]`. A pattern written against the dotted spelling
// therefore never matches anything that came out of the parser. Normalize to
// bytes once and judge the address itself.
function ipv6ToBytes(host) {
  let text = host;

  // A trailing dotted quad (::ffff:127.0.0.1) is just another spelling of the
  // two hextets it encodes — rewrite it so one parser covers both.
  const dotted = text.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const value = ipv4ToInt(dotted[2]);
    if (value === null) return null;
    text = `${dotted[1]}${(value >>> 16).toString(16)}:${(value & 0xffff).toString(16)}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const gap = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (gap < 0 || (halves.length === 1 && head.length !== 8)) return null;

  const bytes = [];
  for (const hextet of [...head, ...Array(gap).fill("0"), ...tail]) {
    if (!/^[0-9a-f]{1,4}$/.test(hextet)) return null;
    const value = Number.parseInt(hextet, 16);
    bytes.push(value >>> 8, value & 0xff);
  }
  return bytes.length === 16 ? bytes : null;
}

function isBlockedIpv6(host) {
  // Drop brackets and any zone id (fe80::1%eth0).
  const bytes = ipv6ToBytes(host.replace(/^\[|\]$/g, "").toLowerCase().split("%")[0]);
  if (!bytes) return false;

  // ::ffff:a.b.c.d (v4-mapped) and ::a.b.c.d (v4-compatible) connect to the
  // embedded IPv4 address, so they have to be judged as IPv4 — this is also
  // what catches :: and ::1, as 0.0.0.0 and 0.0.0.1 in 0.0.0.0/8.
  if (bytes.slice(0, 10).every((b) => b === 0)) {
    const embedsIpv4 =
      (bytes[10] === 0xff && bytes[11] === 0xff) || (bytes[10] === 0 && bytes[11] === 0);
    if (embedsIpv4) {
      return isBlockedIpv4(bytes.slice(12).join("."));
    }
  }

  if ((bytes[0] & 0xfe) === 0xfc) return true;                          // fc00::/7  unique-local
  return bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80;               // fe80::/10 link-local
}

// Throw if URL targets a non-public host. Caller should map to 400.
export function assertPublicUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) throw new Error("Blocked URL: internal host");
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) throw new Error("Blocked URL: internal host");
  if (isBlockedIpv4(host)) throw new Error("Blocked URL: private IP");
  if (host.includes(":") && isBlockedIpv6(host)) throw new Error("Blocked URL: private IP");
}
