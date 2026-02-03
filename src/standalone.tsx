'use client'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { AccessibilityWidget } from './AccessibilityWidget'

// Auto-initialize when script loads
function init() {
  // Create container if it doesn't exist
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
