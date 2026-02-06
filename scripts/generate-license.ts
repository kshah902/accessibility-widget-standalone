#!/usr/bin/env npx ts-node
/**
 * Akby Accessibility Widget — License Key Generator
 *
 * Generates ECDSA P-256 signed license keys bound to a specific domain.
 *
 * Usage:
 *   npx ts-node scripts/generate-license.ts --domain example.com --months 12
 *   npx ts-node scripts/generate-license.ts --domain example.com --months 12 --tier enterprise
 *
 * The private key must be set in the A11Y_PRIVATE_KEY environment variable
 * (as a JSON string of the JWK). See .env.example.
 */

import * as crypto from 'crypto'

// --- Argument parsing ---

function parseArgs(): { domain: string; months: number; tier: string } {
  const args = process.argv.slice(2)
  let domain = ''
  let months = 12
  let tier = 'pro'

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--domain':
      case '-d':
        domain = args[++i]
        break
      case '--months':
      case '-m':
        months = parseInt(args[++i], 10)
        break
      case '--tier':
      case '-t':
        tier = args[++i]
        break
      case '--help':
      case '-h':
        console.log(`
Akby Accessibility Widget — License Key Generator

Usage:
  npx ts-node scripts/generate-license.ts --domain <domain> [options]

Options:
  --domain, -d    Licensed domain (required)
  --months, -m    License duration in months (default: 12)
  --tier, -t      License tier: pro, enterprise (default: pro)
  --help, -h      Show this help message
`)
        process.exit(0)
    }
  }

  if (!domain) {
    console.error('Error: --domain is required')
    process.exit(1)
  }

  if (isNaN(months) || months < 1) {
    console.error('Error: --months must be a positive integer')
    process.exit(1)
  }

  return { domain, months, tier }
}

// --- Base64url encoding ---

function base64urlEncode(data: Buffer | Uint8Array): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// --- Main ---

async function main() {
  const { domain, months, tier } = parseArgs()

  // Load private key from environment
  const privateKeyJson = process.env.A11Y_PRIVATE_KEY
  if (!privateKeyJson) {
    console.error(
      'Error: A11Y_PRIVATE_KEY environment variable is not set.\n' +
      'Set it to the JWK JSON string of your ECDSA P-256 private key.\n' +
      'See .env.example for the format.'
    )
    process.exit(1)
  }

  let privateKeyJwk: any
  try {
    privateKeyJwk = JSON.parse(privateKeyJson)
  } catch {
    console.error('Error: A11Y_PRIVATE_KEY is not valid JSON')
    process.exit(1)
  }

  // Calculate expiry date
  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + months)
  const expiryStr = expiry.toISOString().split('T')[0]

  // Generate unique license ID
  const licenseId = `aw_${crypto.randomBytes(8).toString('hex')}`

  // Build payload
  const payload = {
    d: domain.toLowerCase(),
    e: expiryStr,
    t: tier,
    i: licenseId,
  }

  const payloadStr = JSON.stringify(payload)
  const payloadB64 = base64urlEncode(Buffer.from(payloadStr, 'utf-8'))

  // Import private key and sign
  const privateKey = crypto.createPrivateKey({
    key: privateKeyJwk as any,
    format: 'jwk',
  })

  // Sign the base64url-encoded payload string (matches verification in browser)
  const signature = crypto.sign('SHA256', Buffer.from(payloadB64, 'utf-8'), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363', // Fixed-length format matching Web Crypto API
  })

  const signatureB64 = base64urlEncode(signature)

  // Assemble license key
  const licenseKey = `AW-${payloadB64}.${signatureB64}`

  // Output
  console.log('')
  console.log('=== Akby Accessibility Widget — License Key ===')
  console.log('')
  console.log(`Domain:   ${domain}`)
  console.log(`Expiry:   ${expiryStr}`)
  console.log(`Tier:     ${tier}`)
  console.log(`ID:       ${licenseId}`)
  console.log('')
  console.log('License Key:')
  console.log(licenseKey)
  console.log('')
  console.log('--- Usage ---')
  console.log('')
  console.log('HTML:')
  console.log(`<script src="...standalone.global.js" data-license-key="${licenseKey}"></script>`)
  console.log('')
  console.log('WordPress: Enter the license key in Settings → Accessibility Widget')
  console.log('')
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
