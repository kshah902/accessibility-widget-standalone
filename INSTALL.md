# Akby Accessibility Widget — Installation Guide

## Table of Contents

- [Generating a License Key](#generating-a-license-key)
- [WordPress](#wordpress)
- [HTML / Squarespace / Static Sites](#html--squarespace--static-sites)
- [Next.js / React](#nextjs--react)
- [Self-Hosted](#self-hosted)
- [Troubleshooting](#troubleshooting)

---

## Generating a License Key

> This step is performed by the Akby team, not the client.

```bash
cd /path/to/accessibility-widget-standalone
export A11Y_PRIVATE_KEY='...'  # from .env
npx ts-node scripts/generate-license.ts --domain clientdomain.com --months 12
```

Options:
- `--domain, -d` — Licensed domain (required)
- `--months, -m` — License duration in months (default: 12)
- `--tier, -t` — `pro` or `enterprise` (default: `pro`)

The script outputs a key in the format `AW-xxxx.yyyy`. Save it and send it to the client.

---

## WordPress

1. Download `akby-accessibility-widget.zip` from the [latest GitHub release](https://github.com/kshah902/accessibility-widget-standalone/releases/latest)
2. In WordPress admin, go to **Plugins → Add New → Upload Plugin** and choose the zip file
3. Click **Install Now**, then **Activate**
4. Go to **Settings → Akby Accessibility Widget**
5. Paste the license key into the **License Key** field and click **Save Settings**
6. Visit the site frontend and verify the widget appears in the bottom-right corner

The plugin loads the widget from the jsDelivr CDN and auto-updates from GitHub releases.

---

## HTML / Squarespace / Static Sites

Add these two tags before `</head>` or before `</body>`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@latest/dist/accessibility.css">
<script src="https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@latest/dist/standalone.global.js" data-license-key="AW-YOUR-KEY-HERE"></script>
```

That's it — the widget auto-initializes when the DOM is ready.

### Squarespace-Specific Steps

1. Go to **Settings → Advanced → Code Injection**
2. Paste the two tags into the **Header** or **Footer** section
3. Click **Save**

---

## Next.js / React

### Option A: Script Tag (recommended)

In your root layout (`app/layout.tsx` or `pages/_app.tsx`):

```tsx
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@latest/dist/accessibility.css"
        />
      </head>
      <body>
        {children}
        <Script
          src="https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@latest/dist/standalone.global.js"
          data-license-key="AW-YOUR-KEY-HERE"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
```

### Option B: Global Variable

Set the license key before the script loads:

```tsx
<Script id="a11y-config" strategy="beforeInteractive">
  {`window.__A11Y_LICENSE_KEY__ = "AW-YOUR-KEY-HERE";`}
</Script>
<Script
  src="https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@latest/dist/standalone.global.js"
  strategy="afterInteractive"
/>
```

---

## Self-Hosted

If you prefer to host the files on your own server instead of using the CDN:

1. Download `standalone.global.js` and `accessibility.css` from the [dist folder](https://github.com/kshah902/accessibility-widget-standalone/tree/main/dist) or install via npm:
   ```bash
   npm install @krunalshah/accessibility-widget-standalone
   ```
2. Copy the files from `node_modules/@krunalshah/accessibility-widget-standalone/dist/` to your static assets directory
3. Reference them with local paths:
   ```html
   <link rel="stylesheet" href="/assets/accessibility.css">
   <script src="/assets/standalone.global.js" data-license-key="AW-YOUR-KEY-HERE"></script>
   ```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Widget not appearing | No license key | Add `data-license-key="AW-..."` attribute to the script tag |
| "No license key provided" in console | Key attribute missing or empty | Ensure the `data-license-key` attribute is present and non-empty |
| "Invalid or expired license key" | Key is for a different domain, or has expired | Generate a new key for the correct domain |
| Widget not appearing on HTTP | Web Crypto API requires HTTPS | Serve the site over HTTPS (localhost is exempt) |
| WordPress plugin not updating | Update check blocked | Re-download the latest zip from GitHub releases |

### Keyboard Shortcuts

Once installed, the widget supports these shortcuts:

| Shortcut | Action |
|----------|--------|
| `Alt+A` (`⌥+A` on Mac) | Toggle accessibility panel |
| `Alt+C` (`⌥+C` on Mac) | Toggle high contrast |
| `Alt+M` (`⌥+M` on Mac) | Toggle reduce motion |
| `Alt+R` (`⌥+R` on Mac) | Reset all settings |
