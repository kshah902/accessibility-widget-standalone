'use client'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { AccessibilityWidget } from './AccessibilityWidget'
import { validateLicense } from './license'

// Store a reference to the script tag immediately (before DOMContentLoaded)
// because document.currentScript is only available during initial script execution
const currentScriptRef =
  typeof document !== 'undefined' ? document.currentScript : null

// Auto-initialize when script loads
async function init() {
  // --- License Validation ---
  const scriptTag =
    currentScriptRef || document.querySelector('script[data-license-key]')

  const licenseKey =
    scriptTag?.getAttribute('data-license-key') ||
    (window as any).__A11Y_LICENSE_KEY__

  if (!licenseKey) {
    console.warn(
      'Akby Accessibility Widget: No license key provided. Add data-license-key="YOUR_KEY" to your script tag.'
    )
    return
  }

  const hostname = window.location.hostname
  const isValid = await validateLicense(licenseKey, hostname)

  if (!isValid) {
    console.warn(
      'Akby Accessibility Widget: Invalid or expired license key for this domain.'
    )
    return
  }

  // --- Render Widget ---
  let container = document.getElementById('a11y-widget-root')
  if (!container) {
    container = document.createElement('div')
    container.id = 'a11y-widget-root'
    document.body.appendChild(container)
  }

  const root = createRoot(container)
  root.render(<AccessibilityWidget />)
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// Export for manual initialization if needed
export { init, AccessibilityWidget }
