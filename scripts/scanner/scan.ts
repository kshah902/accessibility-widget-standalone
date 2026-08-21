#!/usr/bin/env npx tsx
/**
 * Akby Accessibility Widget — Real-Code Scanner
 *
 * Runs axe-core against a live site (in a real browser, so it sees the
 * fully-rendered DOM) and prints a structured violation report. This is
 * the "what's actually wrong" half of the remediation pipeline — it does
 * not touch source code. See fix.ts for turning a subset of these
 * findings into a PR against the site's own repo.
 *
 * Usage:
 *   npx tsx scripts/scanner/scan.ts --domain akby.com
 *   npx tsx scripts/scanner/scan.ts --domain akby.com --path /about --json
 *   npx tsx scripts/scanner/scan.ts --all
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

interface SiteConfig {
  domain: string
  url: string
  repo: string | null
  framework: string
}

interface AxeNode {
  html: string
  target: string[]
  failureSummary?: string
}

interface AxeViolation {
  id: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null
  description: string
  help: string
  helpUrl: string
  nodes: AxeNode[]
}

interface ScanResult {
  domain: string
  url: string
  scannedAt: string
  violationCount: number
  nodeCount: number
  violations: AxeViolation[]
}

const AUTO_FIXABLE_RULES = new Set([
  'html-has-lang',
  'html-lang-valid',
  'image-alt',
  'label',
  'link-name',
  'button-name',
  'heading-order',
])

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
    urlPath: get('--path') ?? '/',
    all: args.includes('--all'),
    json: args.includes('--json'),
    outDir: get('--out') ?? path.join(__dirname, 'reports'),
  }
}

async function scanUrl(url: string): Promise<{ violations: AxeViolation[]; nodeCount: number }> {
  const browser = await chromium.launch()
  try {
    // bypassCSP: some client sites ship a strict script-src CSP that would
    // otherwise block axe-core's inline injection below — that's a
    // property of the site's own security headers, not something this
    // scan should be defeated by.
    const context = await browser.newContext({ bypassCSP: true })
    const page = await context.newPage()
    // 'networkidle' times out on pages with any persistent background
    // traffic (chat widgets polling, analytics beacons) — 'load' plus a
    // fixed settle delay is more robust across real client sites.
    await page.goto(url, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(1500)

    const axeSource = fs.readFileSync(
      require.resolve('axe-core/axe.min.js'),
      'utf-8'
    )
    await page.addScriptTag({ content: axeSource })

    const results = await page.evaluate(async () => {
      // @ts-expect-error axe is injected globally by the script tag above
      return await axe.run(document, {
        resultTypes: ['violations'],
      })
    })

    const violations = (results as any).violations as AxeViolation[]
    const nodeCount = violations.reduce((sum, v) => sum + v.nodes.length, 0)
    return { violations, nodeCount }
  } finally {
    await browser.close()
  }
}

function severityRank(impact: AxeViolation['impact']): number {
  switch (impact) {
    case 'critical':
      return 0
    case 'serious':
      return 1
    case 'moderate':
      return 2
    case 'minor':
      return 3
    default:
      return 4
  }
}

function printReport(result: ScanResult) {
  console.log('')
  console.log(`=== ${result.domain} (${result.url}) ===`)
  console.log(`${result.violationCount} rule violations, ${result.nodeCount} affected elements`)
  console.log('')

  const sorted = [...result.violations].sort(
    (a, b) => severityRank(a.impact) - severityRank(b.impact)
  )

  for (const v of sorted) {
    const fixable = AUTO_FIXABLE_RULES.has(v.id) ? ' [auto-fixable candidate]' : ''
    console.log(`[${(v.impact ?? 'unknown').toUpperCase()}] ${v.id} — ${v.help}${fixable}`)
    console.log(`  ${v.nodes.length} element(s). ${v.helpUrl}`)
    for (const node of v.nodes.slice(0, 3)) {
      const snippet = node.html.length > 100 ? node.html.slice(0, 100) + '…' : node.html
      console.log(`    - ${snippet}`)
    }
    if (v.nodes.length > 3) {
      console.log(`    … and ${v.nodes.length - 3} more`)
    }
    console.log('')
  }
}

async function scanOne(site: SiteConfig, urlPath: string, opts: ReturnType<typeof parseArgs>) {
  const target = new URL(urlPath, site.url).toString()
  console.log(`Scanning ${target}...`)

  const { violations, nodeCount } = await scanUrl(target)

  const result: ScanResult = {
    domain: site.domain,
    url: target,
    scannedAt: new Date().toISOString(),
    violationCount: violations.length,
    nodeCount,
    violations,
  }

  if (!fs.existsSync(opts.outDir)) fs.mkdirSync(opts.outDir, { recursive: true })
  const outFile = path.join(opts.outDir, `${site.domain}.json`)
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2))

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printReport(result)
    console.log(`Full report saved to ${outFile}`)
  }

  return result
}

async function main() {
  const opts = parseArgs()
  const sites = loadSites()

  if (opts.all) {
    const summary: { domain: string; violations: number; nodes: number }[] = []
    for (const site of sites) {
      try {
        const result = await scanOne(site, '/', opts)
        summary.push({ domain: site.domain, violations: result.violationCount, nodes: result.nodeCount })
      } catch (err: any) {
        console.error(`FAILED to scan ${site.domain}: ${err.message}`)
        summary.push({ domain: site.domain, violations: -1, nodes: -1 })
      }
    }
    console.log('')
    console.log('=== Summary ===')
    for (const s of summary) {
      console.log(
        s.violations === -1
          ? `${s.domain}: scan failed`
          : `${s.domain}: ${s.violations} rule violations, ${s.nodes} elements`
      )
    }
    return
  }

  if (!opts.domain) {
    console.error('Usage: scan.ts --domain <domain> [--path /page] [--json] | --all')
    process.exit(1)
  }

  const site = sites.find((s) => s.domain === opts.domain)
  if (!site) {
    console.error(`Unknown domain "${opts.domain}" — not in sites.json`)
    process.exit(1)
  }

  await scanOne(site, opts.urlPath, opts)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
