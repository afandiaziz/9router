// #3293 — assertPublicUrl let IPv4-mapped IPv6 through, so a user-supplied
// baseUrl of http://[::ffff:7f00:1] reached 127.0.0.1.
//
// The mapped-address check existed (GHSA-hj98-rc6w-m8cw) but was unreachable:
// it matched `::ffff:` followed by a dotted quad, and WHATWG URL canonicalizes
// that spelling to hextets before the guard ever sees it —
// new URL("http://[::ffff:127.0.0.1]").hostname === "[::ffff:7f00:1]".
import { describe, it, expect } from "vitest";
import { assertPublicUrl } from "../../src/shared/utils/ssrfGuard.js";

const blocked = (url) => expect(() => assertPublicUrl(url), url).toThrow();
const allowed = (url) => expect(() => assertPublicUrl(url), url).not.toThrow();

describe("assertPublicUrl — IPv4-mapped IPv6 (#3293)", () => {
  // What the URL parser hands the guard, whichever spelling the attacker sent.
  it("normalizes both spellings of a mapped address to the same hostname", () => {
    expect(new URL("http://[::ffff:127.0.0.1]/").hostname).toBe("[::ffff:7f00:1]");
    expect(new URL("http://[::ffff:169.254.169.254]/").hostname).toBe("[::ffff:a9fe:a9fe]");
  });

  it("blocks loopback written as a mapped address, in either spelling", () => {
    blocked("http://[::ffff:127.0.0.1]/");
    blocked("http://[::ffff:7f00:1]/");
    blocked("http://[::ffff:127.0.0.1]:19998/embeddings");
  });

  it("blocks cloud metadata written as a mapped address", () => {
    blocked("http://[::ffff:169.254.169.254]/latest/meta-data/");
    blocked("http://[::ffff:a9fe:a9fe]/latest/meta-data/");
  });

  it("blocks private ranges written as a mapped address", () => {
    blocked("http://[::ffff:10.0.0.1]/");
    blocked("http://[::ffff:192.168.1.1]/");
    blocked("http://[::ffff:172.16.0.1]/");
  });

  // ::a.b.c.d — the deprecated v4-compatible form connects to the same address.
  it("blocks the v4-compatible form too", () => {
    blocked("http://[::127.0.0.1]/");
    blocked("http://[::169.254.169.254]/");
  });
});

describe("assertPublicUrl — IPv6 literals", () => {
  it("blocks loopback and unspecified, however they are written", () => {
    blocked("http://[::1]/");
    blocked("http://[::]/");
    blocked("http://[0:0:0:0:0:0:0:1]/");
  });

  it("blocks unique-local fc00::/7", () => {
    blocked("http://[fc00::1]/");
    blocked("http://[fd00::1]/");
    blocked("http://[fdff:ffff::1]/");
  });

  // fe80::/10 spans fe80 through febf — the old prefix test only saw "fe80:".
  it("blocks the whole link-local fe80::/10 range", () => {
    blocked("http://[fe80::1]/");
    blocked("http://[fe90::1]/");
    blocked("http://[feb0::1]/");
    blocked("http://[fe80::1%25eth0]/");
  });

  it("still allows public IPv6", () => {
    allowed("https://[2606:4700:4700::1111]/");
    allowed("https://[2001:4860:4860::8888]/");
    allowed("https://[2a00:1450:4001:800::200e]/");
  });
});

describe("assertPublicUrl — regressions guarded elsewhere", () => {
  it("still blocks the IPv4 forms the URL parser normalizes", () => {
    blocked("http://127.0.0.1/");
    blocked("http://127.1/");
    blocked("http://2130706433/");
    blocked("http://0177.0.0.1/");
    blocked("http://169.254.169.254/");
    blocked("http://10.0.0.1/");
    blocked("http://192.168.1.1/");
  });

  it("still blocks internal hostnames", () => {
    blocked("http://localhost/");
    blocked("http://foo.internal/");
    blocked("http://bar.local/");
  });

  it("still allows ordinary providers", () => {
    allowed("https://api.openai.com/v1");
    allowed("https://api.anthropic.com/v1/messages");
    allowed("http://8.8.8.8/");
  });
});

describe("assertPublicUrl — reserved ranges and scheme", () => {
  // Reserved space that the original list left out. 169.254/16 was already
  // covered, but the neighbouring blocks are just as unroutable.
  it("blocks reserved and non-routable IPv4 blocks", () => {
    blocked("http://100.64.0.1/");     // CGNAT
    blocked("http://192.0.0.1/");      // IETF protocol assignments
    blocked("http://198.18.0.1/");     // benchmarking
    blocked("http://239.255.255.250/"); // multicast (SSDP)
    blocked("http://255.255.255.255/"); // reserved
  });

  it("rejects a non-http(s) scheme outright", () => {
    blocked("file:///etc/passwd");
    blocked("gopher://example.com/");
    blocked("ftp://example.com/");
  });

  it("ignores a trailing dot on the hostname", () => {
    blocked("http://localhost./");
  });
});
