# Accessibility Scanner

Goes beyond the widget's runtime overlay to find and (for a narrow, safe
subset of issues) fix real problems in a site's own markup — the thing an
overlay alone can't do, and the reason overlay-only sites keep losing
accessibility lawsuits (see the audit artifact from 2026-08-21).

## What it does

`scan.ts` runs [axe-core](https://github.com/dequelabs/axe-core) against a
live site in a real headless browser and reports every violation, tagged
by severity.

`fix.ts` reads a scan report and, for the handful of rules that are
genuinely zero-judgment to fix (see `MECHANICAL_RULES`), patches the
relevant file in a local checkout and opens a **review-only PR** against
the site's own GitHub repo. It does not auto-merge anything.

Everything else axe-core finds — missing alt text, unlabeled form
fields, empty link/button names, heading-order gaps, color contrast — is
reported but *not* auto-fixed, because those need a judgment call (what
should the alt text actually say?) that shouldn't happen unsupervised.

## Usage

```bash
# Scan one site, print + save a JSON report
npx tsx scripts/scanner/scan.ts --domain akby.com

# Scan a specific page
npx tsx scripts/scanner/scan.ts --domain akby.com --path /about

# Scan every site in sites.json
npx tsx scripts/scanner/scan.ts --all

# Apply the mechanical auto-fixes and open a PR (needs a local checkout)
export GITHUB_BOT_TOKEN=ghp_...   # any token with contents:write + pull_requests:write on the repo
npx tsx scripts/scanner/fix.ts --domain totaltox.net --repo-path /path/to/local/checkout

# See what it would change without opening a PR
npx tsx scripts/scanner/fix.ts --domain totaltox.net --repo-path /path/to/local/checkout --dry-run
```

## `sites.json`

One entry per client domain: `domain`, `url`, `repo` (`owner/name`, or
`null` for sites with no accessible repo — currently the two WordPress
sites), and `framework` (`nextjs`, `nextjs-payload`, `static-html`, or
`wordpress`). `fix.ts` uses `framework` to decide which file types to
search for the `<html>` tag.

## Auth

`open-pr.ts` reads `GITHUB_BOT_TOKEN` (falls back to `GITHUB_TOKEN`). It
doesn't care whether that's a PAT from a dedicated bot account or a
GitHub App installation token — either works as long as it has
`contents:write` and `pull_requests:write` on the target repo.

## Status (as of 2026-08-21)

- `scan.ts` — working, tested against real production sites (akby.com,
  totaltox.net). Found genuine issues on both (color contrast, missing
  landmark regions).
- `fix.ts` — logic validated against a synthetic fixture; auto-fixes only
  `html-has-lang` / `html-lang-valid` so far. None of the 11 client sites
  currently has a live example of that violation, so it hasn't opened a
  real PR yet.
- Next candidates for the mechanical set, in order of how safely
  automatable they are: `image-alt` (needs generated alt text — a
  judgment call, not purely mechanical, likely needs a human/agent in
  the loop per image rather than a script), `label` (only safe when
  there's an unambiguous adjacent `<label>` text to wire up via
  `for`/`id`), `heading-order` (report-only — reordering headings can
  change page meaning, shouldn't be automatic).
