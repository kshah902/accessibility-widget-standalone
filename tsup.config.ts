import { defineConfig } from 'tsup'

// Minimal, safe CSS minifier: strips comments and collapses whitespace.
// No CSS in this project uses whitespace-significant string values (checked:
// no `content: "..."` with meaningful spaces), and '*' never appears inside
// the base64 font data below, so comment-stripping can't accidentally eat
// into a data URL. Avoids pulling in a minifier dependency for two files.
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // strip comments
    .replace(/\s+/g, ' ') // collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // trim around punctuation
    .replace(/;}/g, '}') // drop trailing semicolons
    .trim()
}

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

    // Core stylesheet — always loaded. Deliberately excludes the
    // OpenDyslexic @font-face rules (see fonts.css / accessibility-fonts.css)
    // since embedding both font weights here made this file 93% dead weight
    // for the vast majority of visitors who never enable that toggle.
    const globalCss = fs.readFileSync('src/accessibility.css', 'utf8')
    const widgetCss = fs.readFileSync('src/AccessibilityWidget.css', 'utf8')
    const combined = minifyCss(`${globalCss}\n${widgetCss}`)
    fs.writeFileSync('dist/accessibility.css', combined)
    console.log(`CSS written to dist/accessibility.css (${combined.length} bytes)`)

    // Fonts stylesheet — lazy-loaded at runtime only when the Dyslexia Font
    // toggle is switched on (see standalone.tsx / useAccessibilitySettings.ts).
    const fontsCss = minifyCss(fs.readFileSync('src/fonts.css', 'utf8'))
    fs.writeFileSync('dist/accessibility-fonts.css', fontsCss)
    console.log(`CSS written to dist/accessibility-fonts.css (${fontsCss.length} bytes)`)
  },
})
