import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/standalone.tsx'],
  format: ['iife'],
  globalName: 'AccessibilityWidget',
  minify: true,
  // Bundle React into the output - DO NOT externalize
  noExternal: [/.*/],
  outDir: 'dist',
  clean: true,
  // Define process.env.NODE_ENV for browser compatibility (React needs this)
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  onSuccess: async () => {
    const fs = await import('fs')
    // Copy CSS to dist
    const globalCss = fs.readFileSync('src/accessibility.css', 'utf8')
    const widgetCss = fs.readFileSync('src/AccessibilityWidget.css', 'utf8')
    const combined = `${globalCss}\n\n/* Widget Component Styles */\n${widgetCss}`
    fs.writeFileSync('dist/accessibility.css', combined)
    console.log('CSS copied to dist/accessibility.css')
  },
})
