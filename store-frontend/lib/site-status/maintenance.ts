/**
 * The maintenance page the proxy returns with HTTP 503 while the site is
 * stopped and the visitor is not the owner (security rule F2).
 *
 * A plain string on purpose: `proxy.ts` cannot render React, and a fully
 * self-contained document means no asset request, no link, no script and no
 * data of any kind can leak — it is the same bytes for every visitor.
 * Constraints honoured here:
 * - static Persian text only ("سایت متوقف شده است"),
 * - noindex (meta + X-Robots-Tag header, set by the proxy),
 * - no links at all (no login, no admin, no contact),
 * - inline CSS only, so the page renders even if nothing else is reachable.
 */
export const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>سایت متوقف شده است</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #ffffff;
    color: #1a1a1a;
    font-family: Vazirmatn, Tahoma, system-ui, sans-serif;
    line-height: 1.9;
  }
  main {
    width: 100%;
    max-width: 420px;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 32px 24px;
    text-align: center;
  }
  h1 { margin: 0 0 12px; font-size: 20px; font-weight: 800; }
  p { margin: 0; font-size: 14px; color: #4b5563; }
</style>
</head>
<body>
<main>
<h1>سایت متوقف شده است</h1>
<p>در حال حاضر امکان مشاهده‌ی سایت وجود ندارد. لطفاً بعداً مراجعه کنید.</p>
</main>
</body>
</html>
`;
