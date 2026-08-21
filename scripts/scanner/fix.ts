#!/usr/bin/env npx tsx
/**
 * Akby Accessibility Widget — Auto-fix (mechanical rules only)
 *
 * Reads a scan.ts report and, for the small set of violations that are
 * genuinely zero-judgment (see MECHANICAL_RULES below), patches the
 * relevant source file in a local checkout and opens a PR via open-pr.ts.
 *
 * Everything NOT in MECHANICAL_RULES (missing alt text, unlabeled form
 * inputs, empty link/button names, heading-order gaps) is intentionally
 * left alone here — those need a judgment call (what should the alt text
 * *say*?) that a script shouldn't make unsupervised. Report those from
 * scan.ts and handle them by hand, or as a supervised follow-up pass.
 *
 * Usage:
 *   npx tsx scripts/scanner/fix.ts --domain totaltox.net --repo-path /path/to/local/checkout
 *   npx tsx scripts/scanner/fix.ts --domain totaltox.net --repo-path ... --dry-run
 */

import * as fs from 'fs'
import * as path from 'path'
import { openFixPr, type FileChange } from './open-pr'

const MECHANICAL_RULES = new Set(['html-has-lang', 'html-lang-valid'])

interface SiteConfig {
  domain: string
  url: string
  repo: string | null
  framework: string
}

function loadSites(): SiteConfig[] {
  const raw = fs.readFileSync(path.join(__dirname, 'sites.json'), 'utf-8')
  return JSON.parse(raw)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }
  return {
    domain: get('--domain'),
    repoPath: get('--repo-path'),
    dryRun: args.includes('--dry-run'),
  }
}

function walk(dir: string, exts: string[], ignore: string[] = ['node_modules', '.next', '.git']): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full, exts, ignore))
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(full)
    }
  }
  return out
}

/** Find <html ...> tags (JSX or plain HTML) missing a lang attribute. */
function findMissingLangFiles(repoPath: string, framework: string): { file: string; fixed: string; original: string }[] {
  const exts = framework === 'static-html' ? ['.html'] : ['.tsx', '.jsx']
  const files = walk(repoPath, exts)
  const fixes: { file: string; fixed: string; original: string }[] = []

  const htmlTagRe = /<html\b([^>]*)>/i

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const match = content.match(htmlTagRe)
    if (!match) continue

    const attrs = match[1]
    if (/\blang\s*=/.test(attrs)) continue // already has a lang attribute

    const fixedTag = framework === 'static-html'
      ? `<html${attrs} lang="en">`
      : `<html${attrs} lang="en">`
    const fixed = content.replace(htmlTagRe, fixedTag)
    fixes.push({ file, fixed, original: content })
  }

  return fixes
}

async function main() {
  const opts = parseArgs()
  if (!opts.domain || !opts.repoPath) {
    console.error('Usage: fix.ts --domain <domain> --repo-path <local checkout path> [--dry-run]')
    process.exit(1)
  }

  const sites = loadSites()
  const site = sites.find((s) => s.domain === opts.domain)
  if (!site) {
    console.error(`Unknown domain "${opts.domain}" — not in sites.json`)
    process.exit(1)
  }
  if (!site.repo) {
    console.error(`${opts.domain} has no repo configured (likely WordPress) — nothing to auto-fix.`)
    process.exit(1)
  }

  const reportPath = path.join(__dirname, 'reports', `${site.domain}.json`)
  if (!fs.existsSync(reportPath)) {
    console.error(`No scan report at ${reportPath} — run scan.ts first.`)
    process.exit(1)
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))

  const mechanicalViolations = report.violations.filter((v: any) => MECHANICAL_RULES.has(v.id))
  if (mechanicalViolations.length === 0) {
    console.log(`No auto-fixable (mechanical) violations found for ${site.domain}. Nothing to do.`)
    return
  }

  console.log(`Found ${mechanicalViolations.length} mechanical violation(s) for ${site.domain}:`)
  for (const v of mechanicalViolations) console.log(`  - ${v.id}: ${v.help}`)

  const changes: FileChange[] = []

  if (mechanicalViolations.some((v: any) => v.id === 'html-has-lang' || v.id === 'html-lang-valid')) {
    const langFixes = findMissingLangFiles(opts.repoPath, site.framework)
    for (const fix of langFixes) {
      const relPath = path.relative(opts.repoPath, fix.file)
      console.log(`  Patching ${relPath}: adding lang="en" to <html>`)
      changes.push({ path: relPath, content: fix.fixed })
    }
  }

  if (changes.length === 0) {
    console.log('Scan reported a lang violation but no matching <html> tag was found in the local checkout — check manually.')
    return
  }

  if (opts.dryRun) {
    console.log('')
    console.log('--dry-run: not opening a PR. Files that would change:')
    for (const c of changes) console.log(`  ${c.path}`)
    return
  }

  const branch = `a11y-scanner/${site.domain}-mechanical-fixes`
  const prUrl = await openFixPr({
    repo: site.repo,
    branch,
    title: 'Accessibility: fix missing lang attribute',
    body: [
      `Automated fix from the Akby accessibility scanner.`,
      '',
      `Found by axe-core scanning ${site.url}: the page's \`<html>\` tag has no \`lang\` attribute, which breaks screen readers' pronunciation/language switching (WCAG 3.1.1, Level A).`,
      '',
      'This is the only rule this tool auto-fixes without review — everything else it finds (alt text, form labels, contrast, heading order) needs a human judgment call and is reported separately, not committed here.',
      '',
      '**Please review before merging.**',
    ].join('\n'),
    changes,
  })

  console.log('')
  console.log(`PR opened: ${prUrl}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
