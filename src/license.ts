/**
 * Akby Accessibility Widget — License Verification
 *
 * Uses ECDSA P-256 asymmetric cryptography.
 * The public key embedded here can ONLY verify signatures, never create them.
 * The private key is kept secret and used only for generating license keys.
 */

// ECDSA P-256 public key (JWK format) — safe to embed, cannot forge signatures
const PUBLIC_KEY: JsonWebKey = {
  kty: 'EC',
  x: '0CNLE3swwGnDQmKrtufPJUwv4uydQivRVAN9mwR3ayI',
  y: 'HlZaMI_Y-FtE_5PquSM9CDeHxxpW-HiK3YzxS-YkGsA',
  crv: 'P-256',
}

export interface LicensePayload {
  d: string // domain
  e: string // expiry date (ISO: YYYY-MM-DD)
  t: string // tier ("pro", "enterprise", etc.)
  i: string // unique license ID
}

/**
 * Decode a base64url string to Uint8Array
 */
function base64urlDecode(str: string): Uint8Array {
  // Convert base64url to standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Check if the license domain matches the current hostname.
 * Supports:
 * - Exact match: "example.com" === "example.com"
 * - www prefix: "example.com" matches "www.example.com"
 * - localhost always matches keys with d:"localhost"
 */
function domainMatches(licenseDomain: string, hostname: string): boolean {
  const ld = licenseDomain.toLowerCase()
  const hn = hostname.toLowerCase()

  if (ld === hn) return true
  if (ld === 'localhost' && (hn === 'localhost' || hn === '127.0.0.1')) return true
  if (hn === `www.${ld}`) return true
  if (ld === `www.${hn}`) return true

  return false
}

/**
 * Validate a license key against the current hostname.
 *
 * License key format: AW-{base64url(payload)}.{base64url(signature)}
 *
 * Returns true only if:
 * 1. Key format is valid
 * 2. ECDSA signature is verified against the embedded public key
 * 3. Licensed domain matches the current hostname
 * 4. License has not expired
 */
export async function validateLicense(
  licenseKey: string,
  hostname: string
): Promise<boolean> {
  try {
    // Check for Web Crypto API
    if (
      typeof crypto === 'undefined' ||
      !crypto.subtle
    ) {
      console.warn(
        'Akby Accessibility Widget: Web Crypto API not available. License validation requires HTTPS.'
      )
      return false
    }

    // Parse the license key
    if (!licenseKey.startsWith('AW-')) {
      return false
    }

    const keyBody = licenseKey.slice(3) // Remove "AW-" prefix
    const lastDotIndex = keyBody.lastIndexOf('.')
    if (lastDotIndex === -1) {
      return false
    }

    const payloadB64 = keyBody.slice(0, lastDotIndex)
    const signatureB64 = keyBody.slice(lastDotIndex + 1)

    if (!payloadB64 || !signatureB64) {
      return false
    }

    // Decode and parse payload
    const payloadBytes = base64urlDecode(payloadB64)
    const payloadStr = new TextDecoder().decode(payloadBytes)
    let payload: LicensePayload

    try {
      payload = JSON.parse(payloadStr)
    } catch {
      return false
    }

    // Verify required fields exist
    if (!payload.d || !payload.e || !payload.t || !payload.i) {
      return false
    }

    // Import the public key
    const key = await crypto.subtle.importKey(
      'jwk',
      PUBLIC_KEY,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    )

    // Verify the ECDSA signature
    // The signature is over the base64url-encoded payload string (not the raw bytes)
    const signatureBytes = base64urlDecode(signatureB64)
    const dataToVerify = new TextEncoder().encode(payloadB64)

    const isSignatureValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signatureBytes,
      dataToVerify
    )

    if (!isSignatureValid) {
      return false
    }

    // Check domain
    if (!domainMatches(payload.d, hostname)) {
      return false
    }

    // Check expiry
    const expiryDate = new Date(payload.e + 'T23:59:59Z')
    if (isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
      return false
    }

    return true
  } catch {
    return false
  }
}
