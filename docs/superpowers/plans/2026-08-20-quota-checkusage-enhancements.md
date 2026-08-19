# Quota Copy-Key + /check-usage Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-key Copy button to Quota Sharing dashboard cards, and polish the public /check-usage page (colors, bigger chips + copy animation, real fill-grow+shimmer progress bar, cookie auto-fill+auto-load) — without changing guest exposure or the routing engine.

**Architecture:** Four files. `brutal.css` gains the animation keyframes + bigger chip size (scoped under `.brutal-scope`). `check-usage/page.js` gets color/emphasis edits, an animated progress fill driven by a `barWidth` state, a chip copy-pop, and cookie read/write in effects. The dashboard `route.js` GET stops stripping the full key; `QuotaSharingClient.js` renders the full key + a per-card Copy button. Guest `/api/public/check-usage` is untouched.

**Tech Stack:** Next 16 App Router, React 19, Tailwind v4, scoped plain CSS, inline SVG, `document.cookie`. No new npm deps.

## Global Constraints

- No new npm dependencies. Icons are inline SVG; cookies via `document.cookie`.
- Guest exposure unchanged: do NOT modify `src/app/api/public/check-usage/route.js` — it still returns only masked `keyPrefix`.
- Full-key exposure is limited to the auth-protected `GET /api/quota-keys` and the dashboard card. Guests never receive a full key.
- All /check-usage CSS stays scoped under `.brutal-scope` (except `@keyframes` and the `@media (prefers-reduced-motion)` block whose selectors are `.brutal-scope` classes). Do not edit `globals.css` or `layout.js`.
- Respect `prefers-reduced-motion: reduce`: progress grow, shimmer, and chip copy-pop disabled (bar shows final width instantly).
- Cookie: name `qsk`, `path=/check-usage`, `SameSite=Strict`, expiry = `resetsAt` if present else now+30 days.
- Stat-card tint opacity = `0.55`. Allowed-model chip font-size = `0.9rem`.
- `perModel` alias is ALREADY resolved server-side and the page already renders `m.alias || m.model` — this is verification-only, not a code change.
- Work on branch `feat/quota-checkusage-enhancements` (already created). Commit trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`.
- These are presentational pages with no unit tests. Verify via `npx eslint`, the existing quota-keys vitest files, and a dev-server render.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/app/check-usage/brutal.css` (modify) | Bigger `.b-chip`; add `@keyframes brutal-shimmer` + `.b-progress-fill`/`::after`; `@keyframes brutal-copy-pop` + `.b-chip-pop`; extend reduced-motion guard. |
| `src/app/check-usage/page.js` (modify) | Header emphasis swap; readable meta colors; stat tint 0.55; animated progress fill via `barWidth` state; chip copy-pop; cookie auto-fill+auto-load. |
| `src/app/api/quota-keys/route.js` (modify) | `GET` returns full `key` alongside masked `keyPrefix`. |
| `src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js` (modify) | Card shows full key + per-card Copy button with copied state. |

Task order: CSS first (Task 1) so page.js (Task 2) can reference the new classes; dashboard (Task 3) is independent.

---

## Task 1: brutal.css — bigger chips, progress animation, copy-pop

**Files:**
- Modify: `src/app/check-usage/brutal.css`

**Interfaces:**
- Consumes: existing `.brutal-scope` tokens.
- Produces (used by Task 2): class `.b-progress-track`, `.b-progress-fill` (transitions its own `width`, has an inner `::after` shimmer), `.b-chip-pop` (copy pop animation), and a bigger `.b-chip`. Keyframes `brutal-shimmer`, `brutal-copy-pop`.

- [ ] **Step 1: Enlarge `.b-chip`**

In `src/app/check-usage/brutal.css`, find the `.b-chip` block and change font-size + padding.

Replace:
```css
.brutal-scope .b-chip {
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 2px solid hsl(var(--border));
  border-radius: var(--radius);
  background-color: hsl(var(--card));
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  cursor: pointer;
}
```
with:
```css
.brutal-scope .b-chip {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  border: 2px solid hsl(var(--border));
  border-radius: var(--radius);
  background-color: hsl(var(--card));
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  cursor: pointer;
}
```

- [ ] **Step 2: Add progress-bar classes + shimmer keyframe**

Append to `src/app/check-usage/brutal.css` (after the `.b-alert` block, before the `/* ---- Animations ---- */` section is fine — appending at end is also fine):

```css
/* ---- Progress bar (fill-grow + shimmer) ---- */
.brutal-scope .b-progress-track {
  width: 100%; height: 1rem; border-radius: var(--radius);
  border: 2px solid hsl(var(--border));
  background: hsl(var(--muted));
  overflow: hidden;
}
.brutal-scope .b-progress-fill {
  height: 100%;
  position: relative;
  overflow: hidden;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.brutal-scope .b-progress-fill::after {
  content: "";
  position: absolute; top: 0; left: 0; height: 100%; width: 50%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  animation: brutal-shimmer 2.8s ease-in-out infinite;
  pointer-events: none;
}
@keyframes brutal-shimmer {
  0% { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%) skewX(-20deg); }
}
```

- [ ] **Step 3: Add chip copy-pop keyframe + class**

Append to `src/app/check-usage/brutal.css`:

```css
/* ---- Chip copy pop ---- */
@keyframes brutal-copy-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.12); }
  70% { transform: scale(0.97); }
  100% { transform: scale(1); }
}
.brutal-scope .b-chip-pop { animation: brutal-copy-pop 0.35s ease-in-out; }
```

- [ ] **Step 4: Extend the reduced-motion guard**

In `src/app/check-usage/brutal.css`, find the existing `@media (prefers-reduced-motion: reduce)` block and add the new animated selectors. Replace:
```css
@media (prefers-reduced-motion: reduce) {
  .brutal-scope .animate-float,
  .brutal-scope .animate-reveal-up,
  .brutal-scope .animate-spin-slow,
  .brutal-scope .animate-pulse-soft,
  .brutal-scope .hover-tilt-shake:hover,
  .brutal-scope-spark {
    animation: none !important;
  }
}
```
with:
```css
@media (prefers-reduced-motion: reduce) {
  .brutal-scope .animate-float,
  .brutal-scope .animate-reveal-up,
  .brutal-scope .animate-spin-slow,
  .brutal-scope .animate-pulse-soft,
  .brutal-scope .hover-tilt-shake:hover,
  .brutal-scope .b-chip-pop,
  .brutal-scope .b-progress-fill::after,
  .brutal-scope-spark {
    animation: none !important;
  }
  .brutal-scope .b-progress-fill { transition: none !important; }
}
```

- [ ] **Step 5: Verify braces balance**

Run: `node -e "const c=require('fs').readFileSync('src/app/check-usage/brutal.css','utf8');const o=(c.match(/{/g)||[]).length,cl=(c.match(/}/g)||[]).length;if(o!==cl){console.error('brace mismatch',o,cl);process.exit(1)}console.log('ok',o)"`
Expected: `ok <n>`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/check-usage/brutal.css
git commit -m "feat(check-usage): bigger chips, progress fill+shimmer, copy-pop keyframes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: check-usage page.js — colors, progress animation, cookie, chip pop

**Files:**
- Modify: `src/app/check-usage/page.js`

**Interfaces:**
- Consumes: Task 1 classes (`.b-progress-track`, `.b-progress-fill`, `.b-chip-pop`, bigger `.b-chip`).
- Produces: no new exports; the default `CheckUsagePage` component with cookie behavior + animated bar.

**Contract preserved:** state `key/result/error/loading/refreshing/howToTab`; `fetchUsage`/`handleSubmit`/`handleRefresh`; POST `/api/public/check-usage` with `{ key: apiKey.trim() }`; all null-guards.

- [ ] **Step 1: Add cookie helpers + barWidth state**

At the top of `CheckUsagePage()` (after the existing `useState` declarations, before the click-spark `useEffect`), add a `barWidth` state and cookie helpers.

Find:
```js
  const [howToTab, setHowToTab] = useState("curl");

  // Brutalist click-spark — pink particles on any click within the page.
  useEffect(() => {
```
Replace with:
```js
  const [howToTab, setHowToTab] = useState("curl");
  const [barWidth, setBarWidth] = useState(0);

  const COOKIE_NAME = "qsk";
  const readCookie = (name) => {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  };
  const writeKeyCookie = (val, resetsAt) => {
    if (typeof document === "undefined") return;
    const expires = resetsAt ? new Date(resetsAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(val)}; expires=${expires.toUTCString()}; path=/check-usage; SameSite=Strict`;
  };
  const clearKeyCookie = () => {
    if (typeof document === "undefined") return;
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/check-usage; SameSite=Strict`;
  };

  // Brutalist click-spark — pink particles on any click within the page.
  useEffect(() => {
```

- [ ] **Step 2: Write the cookie on successful check; animate the bar**

Replace the whole `fetchUsage` function:
```js
  const fetchUsage = async (apiKey, opts = {}) => {
    const isRefresh = opts.refresh || false;
    if (isRefresh) setRefreshing(true);
    else {
      setLoading(true);
      setResult(null);
    }
    setError("");
    try {
      const res = await fetch("/api/public/check-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.keyValid) {
        setError(data.error || "Invalid quota key");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Failed to fetch usage");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };
```
with:
```js
  const fetchUsage = async (apiKey, opts = {}) => {
    const isRefresh = opts.refresh || false;
    const fromCookie = opts.fromCookie || false;
    if (isRefresh) setRefreshing(true);
    else {
      setLoading(true);
      setResult(null);
    }
    setError("");
    try {
      const res = await fetch("/api/public/check-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.keyValid) {
        setError(data.error || "Invalid quota key");
        // A stale key from the cookie should not keep auto-loading a broken state.
        if (fromCookie) clearKeyCookie();
      } else {
        setResult(data);
        writeKeyCookie(apiKey.trim(), data.resetsAt);
      }
    } catch (err) {
      setError("Failed to fetch usage");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };
```

- [ ] **Step 3: Auto-load from cookie on mount; grow the bar when result changes**

Immediately AFTER the click-spark `useEffect` (the one ending with `}, []);`), add two effects:
```js
  // Auto-fill + auto-load a saved quota key from the cookie (once, on mount).
  useEffect(() => {
    const saved = readCookie(COOKIE_NAME);
    if (saved) {
      setKey(saved);
      fetchUsage(saved, { fromCookie: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate the progress bar from 0 to the target percent whenever a result arrives.
  useEffect(() => {
    if (!result) {
      setBarWidth(0);
      return;
    }
    const target = result.percent || 0;
    setBarWidth(0);
    const raf = requestAnimationFrame(() => setBarWidth(target));
    return () => cancelAnimationFrame(raf);
  }, [result]);
```

- [ ] **Step 4: Clear the cookie on "Check Another Key"**

Find:
```js
              <button
                onClick={() => {
                  setResult(null);
                  setKey("");
                }}
                className="b-btn-ghost flex-1"
              >
                Check Another Key
              </button>
```
Replace with:
```js
              <button
                onClick={() => {
                  setResult(null);
                  setKey("");
                  clearKeyCookie();
                }}
                className="b-btn-ghost flex-1"
              >
                Check Another Key
              </button>
```

---

- [ ] **Step 5: Header emphasis swap (name = primary, keyPrefix = muted)**

Find:
```js
                <div className="min-w-0">
                  <span className="font-mono font-bold" style={{ color: "hsl(var(--primary))" }}>
                    {result.keyPrefix}
                  </span>
                  <span className="ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {result.name}
                  </span>
                </div>
```
Replace with:
```js
                <div className="min-w-0">
                  <span className="font-bold text-lg" style={{ color: "hsl(var(--primary))" }}>
                    {result.name}
                  </span>
                  <span className="ml-2 font-mono text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {result.keyPrefix}
                  </span>
                </div>
```

- [ ] **Step 6: Replace the token-usage bar markup (readable colors + animated fill)**

Find:
```js
              {/* Token usage bar */}
              <div>
                <div className="flex justify-between text-sm mb-1 font-bold">
                  <span>Token Usage ({result.limitPeriod})</span>
                  <span>{result.percent != null ? `${result.percent}%` : "Unlimited"}</span>
                </div>
                <div className="w-full h-4 rounded-md" style={{ border: "2px solid #000", background: "hsl(var(--muted))" }}>
                  <div
                    className="h-full animate-pulse-soft"
                    style={{ width: `${result.percent || 0}%`, background: barColor, borderRight: result.percent ? "2px solid #000" : "none" }}
                  />
                </div>
                <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {result.tokensUsed?.toLocaleString()} / {result.limit?.toLocaleString() || "∞"} tokens
                </p>
                {result.resetsAt && (
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Resets: {new Date(result.resetsAt).toLocaleString()}
                  </p>
                )}
              </div>
```
Replace with:
```js
              {/* Token usage bar */}
              <div>
                <div className="flex justify-between text-sm mb-1 font-bold">
                  <span>Token Usage ({result.limitPeriod})</span>
                  <span>{result.percent != null ? `${result.percent}%` : "Unlimited"}</span>
                </div>
                <div className="b-progress-track">
                  <div
                    className="b-progress-fill"
                    style={{ width: `${barWidth}%`, background: barColor, borderRight: barWidth ? "2px solid #000" : "none" }}
                  />
                </div>
                <p className="text-sm mt-1 font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  {result.tokensUsed?.toLocaleString()} / {result.limit?.toLocaleString() || "∞"} tokens
                </p>
                {result.resetsAt && (
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--foreground))" }}>
                    Resets: {new Date(result.resetsAt).toLocaleString()}
                  </p>
                )}
              </div>
```

- [ ] **Step 7: Raise stat-card tints to 0.55**

Find the four stat-card backgrounds and change each opacity from its current value to `0.55`.

Replace `style={{ background: "hsl(var(--brutal-yellow) / 0.25)" }}` with `style={{ background: "hsl(var(--brutal-yellow) / 0.55)" }}`.
Replace `style={{ background: "hsl(var(--brutal-blue) / 0.2)" }}` with `style={{ background: "hsl(var(--brutal-blue) / 0.55)" }}`.
Replace `style={{ background: "hsl(var(--brutal-green) / 0.2)" }}` with `style={{ background: "hsl(var(--brutal-green) / 0.55)" }}`.
Replace `style={{ background: "hsl(var(--brutal-purple) / 0.2)" }}` with `style={{ background: "hsl(var(--brutal-purple) / 0.55)" }}`.

- [ ] **Step 8: Add copy-pop animation to the `Chip` component**

Find the `Chip` component (near the top of the file):
```js
function Chip({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <span onClick={copy} title={`Click to copy: ${text}`} className="b-chip select-all">
      {text}
      <CopyIcon copied={copied} />
    </span>
  );
}
```
Replace with:
```js
function Chip({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <span
      onClick={copy}
      title={`Click to copy: ${text}`}
      className={`b-chip select-all ${copied ? "b-chip-pop" : ""}`}
    >
      {text}
      <CopyIcon copied={copied} />
    </span>
  );
}
```

- [ ] **Step 9: Verify braces balance + eslint**

Run: `node -e "const c=require('fs').readFileSync('src/app/check-usage/page.js','utf8');const b=(c.match(/{/g)||[]).length,cb=(c.match(/}/g)||[]).length;if(b!==cb){console.error('brace mismatch',b,cb);process.exit(1)}console.log('ok',b)"`
Expected: `ok <n>`, exit 0.

Run: `npx eslint src/app/check-usage/page.js`
Expected: exit 0, no new errors (the `// eslint-disable-next-line react-hooks/exhaustive-deps` on the mount effect suppresses the intentional deps warning).

- [ ] **Step 10: Commit**

```bash
git add src/app/check-usage/page.js
git commit -m "feat(check-usage): name-primary header, readable meta, saturated stats, animated bar, cookie autoload, chip copy-pop

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Dashboard — expose full key + card Copy button

**Files:**
- Modify: `src/app/api/quota-keys/route.js`
- Modify: `src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GET /api/quota-keys` responses now include `key` (full `sk-danton-…`) per entry, alongside the existing masked `keyPrefix`. The card renders the full key and a Copy button.

- [ ] **Step 1: Include the full key in the GET list response**

In `src/app/api/quota-keys/route.js`, find the GET loop:
```js
    for (const k of keys) {
      const p = await getQuotaKeyProgress(k.id);
      const { key, ...rest } = k;
      withProgress.push({ ...rest, keyPrefix: key.startsWith("sk-danton-") ? "sk-danton-" + key.slice("sk-danton-".length, "sk-danton-".length + 4) + "…" : key.slice(0, 8) + "…", progress: p });
    }
```
Replace with:
```js
    for (const k of keys) {
      const p = await getQuotaKeyProgress(k.id);
      const { key } = k;
      // Dashboard is auth-protected — expose the full key so the admin can copy it.
      // The public /check-usage endpoint still returns only the masked prefix.
      withProgress.push({ ...k, keyPrefix: key.startsWith("sk-danton-") ? "sk-danton-" + key.slice("sk-danton-".length, "sk-danton-".length + 4) + "…" : key.slice(0, 8) + "…", progress: p });
    }
```

- [ ] **Step 2: Add a per-card copied state**

In `src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js`, find the state block:
```js
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState(null);
```
Replace with:
```js
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
```

- [ ] **Step 3: Add a copyCardKey handler**

Find the existing `copyKey` function:
```js
  const copyKey = () => {
    if (createdKey?.key) {
      navigator.clipboard.writeText(createdKey.key);
    }
  };
```
Replace with:
```js
  const copyKey = () => {
    if (createdKey?.key) {
      navigator.clipboard.writeText(createdKey.key);
    }
  };

  const copyCardKey = async (k) => {
    if (!k?.key) return;
    try {
      await navigator.clipboard.writeText(k.key);
      setCopiedId(k.id);
      setTimeout(() => setCopiedId((cur) => (cur === k.id ? null : cur)), 1500);
    } catch {}
  };
```

- [ ] **Step 4: Show the full key on the card (unmasked)**

Find:
```js
                {/* Key prefix */}
                <div className="font-mono text-xs text-text-muted">{k.keyPrefix}</div>
```
Replace with:
```js
                {/* Full key (dashboard is admin-only) */}
                <div className="font-mono text-xs text-text-main break-all select-all">{k.key}</div>
```

- [ ] **Step 5: Add a Copy button to the card actions row**

Find the actions row:
```js
                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-border-subtle">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(k.id, !k.isActive)}
                  >
                    {k.isActive ? "Disable" : "Enable"}
                  </Button>
```
Replace with:
```js
                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border-subtle">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCardKey(k)}
                  >
                    {copiedId === k.id ? "✓ Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(k.id, !k.isActive)}
                  >
                    {k.isActive ? "Disable" : "Enable"}
                  </Button>
```

- [ ] **Step 6: Verify braces balance + eslint both files**

Run: `node -e "for (const f of ['src/app/api/quota-keys/route.js','src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js']){const c=require('fs').readFileSync(f,'utf8');const b=(c.match(/{/g)||[]).length,cb=(c.match(/}/g)||[]).length;if(b!==cb){console.error('brace mismatch',f,b,cb);process.exit(1)}console.log('ok',f,b)}"`
Expected: two `ok ...` lines, exit 0.

Run: `npx eslint "src/app/api/quota-keys/route.js" "src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js"`
Expected: exit 0.

- [ ] **Step 7: Check existing quota-keys tests still pass (or update intentionally)**

Run: `cd tests && npx vitest run unit/quota-keys-repo.test.js unit/quota-models.test.js`
Expected: PASS. If any test asserted the GET response OMITS `key`, that assertion is now intentionally wrong — update it to expect `key` present (the exposure is a deliberate decision), then re-run. Do not weaken any test that checks the PUBLIC endpoint stays masked.

- [ ] **Step 8: Commit**

```bash
git add "src/app/api/quota-keys/route.js" "src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js"
git commit -m "feat(quota-sharing): expose full key on dashboard list + per-card Copy button

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage:** A1 GET full key (T3.1) ✓; A2 card full key + Copy (T3.2–5) ✓; B1 alias verify-only (noted, no task needed) ✓; B2 header swap (T2.5) ✓; B3 readable meta colors (T2.6) ✓; B4 stat tint 0.55 (T2.7) ✓; C1 bigger chips (T1.1) ✓; C2 chip copy-pop (T1.3 + T2.8) ✓; D1 fill-grow+shimmer (T1.2 + T2.6 markup + T2.1/T2.3 barWidth) ✓; D2 cookie autoload (T2.1–4) ✓; reduced-motion (T1.4) ✓; guest-masked untouched (constraint; no task edits public route) ✓.
- **Placeholder scan:** none — every step has concrete code.
- **Type/name consistency:** `barWidth`/`setBarWidth`, `COOKIE_NAME="qsk"`, `readCookie`/`writeKeyCookie`/`clearKeyCookie`, `fromCookie` opt, `copiedId`/`copyCardKey`, classes `.b-progress-track`/`.b-progress-fill`/`.b-chip-pop` — all defined in Task 1/2 and consumed consistently. `b-progress-track` markup (T2.6) matches CSS (T1.2).
