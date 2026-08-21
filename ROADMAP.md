# Akby Accessibility Widget — Feature Roadmap

> As of v1.5.1, every item below through v1.4.0 has shipped, plus a v1.5.0 batch not originally planned here: readable font, custom text/title/background colors, dictionary lookup, virtual keyboard, voice commands, alt-text detection, auto-remediation, and a 13-language widget UI (`src/i18n.ts`). This file previously understated what was actually built — see checkboxes below.

## Current Features (v1.1.0)

| Feature | Status |
|---------|--------|
| Text Size (100/125/150/175%) | Done |
| High Contrast | Done |
| Reduce Motion / Pause Animations | Done |
| Big Cursor | Done |
| Custom Focus Indicators | Done |
| Color Blindness Filters (protanopia, deuteranopia, tritanopia) | Done |
| Highlight Links | Done |
| Line Height | Done |
| Dyslexia Font (OpenDyslexic) | Done |
| Reading Guide | Done |
| Text-to-Speech | Done |
| Keyboard Shortcuts | Done |
| LocalStorage Persistence | Done |
| Screen Reader Announcements | Done |

---

## Competitor Gap Analysis

Features common across major competitors (UserWay, accessiBe, EqualWeb, AudioEye) that we don't yet have.

### High Priority — All 4 competitors offer these

| Feature | Description |
|---------|-------------|
| Dark Mode / Dark Contrast | A true dark theme, separate from high contrast |
| Text Spacing / Letter Spacing | Adjust spacing between letters and words |
| Hide Images | Strip all images for text-only browsing |
| Reading Mask | Dim everything except a strip around the cursor (spotlight effect) |
| Monochrome / Desaturate | Convert the page to grayscale |
| Saturation Control | Increase or decrease color intensity |
| Pause Animations | Specifically freeze GIFs, CSS animations, and video autoplay individually |
| Text Alignment | Let users set left, center, right, or justified text |
| Page Structure / Headings Navigator | Show a page outline and jump to headings |
| Highlight Hover | Highlight the element under the cursor |

### Medium Priority — 2-3 competitors offer these

| Feature | Description |
|---------|-------------|
| Image Tooltips / Descriptions | Show alt text on hover for images |
| Dictionary | Click a word to see its definition |
| Mute Sounds | Mute all audio and video on the page |
| Legible / Readable Font | A generic highly-legible font (alternative to dyslexia font) |
| Bigger Line Cursor | A larger text cursor (separate from mouse cursor) |
| Seizure-Safe Profile | One-click preset: stops flashing, adjusts colors |
| ADHD-Friendly Profile | One-click preset: dims surroundings, stops motion |
| Cognitive Disability Profile | One-click preset: highlights links/headings, simplifies layout |

### Lower Priority — Nice-to-have / differentiators

| Feature | Description |
|---------|-------------|
| Multi-language Support | Widget UI in different languages |
| Accessibility Statement Generator | Auto-generate a compliance page |
| Virtual Keyboard | On-screen keyboard for motor impairments |
| Voice Commands | Navigate by voice |
| Background Color Customization | Let user pick page background color |
| Text Color Customization | Let user pick text colors |
| Useful Links | Quick jump to important site links |

---

## Release Plan

### v1.2.0 — Display & Visual Enhancements — Shipped

- [x] Dark Mode toggle
- [x] Text Spacing control (letter-spacing + word-spacing)
- [x] Monochrome / Desaturate toggle
- [x] Saturation control (low / high)
- [x] Hide Images toggle

**Files to modify:**
- `src/types.ts` — Add `darkMode`, `textSpacing`, `monochrome`, `saturation`, `hideImages` to `AccessibilitySettings`
- `src/useAccessibilitySettings.ts` — State management + body class toggles for each new setting
- `src/accessibility.css` — CSS rules for dark mode, monochrome filter, text spacing, image hiding
- `src/AccessibilityWidget.tsx` — New toggles in the Display tab

### v1.3.0 — Reading & Navigation Enhancements — Shipped

- [x] Reading Mask (spotlight mode)
- [x] Text Alignment control (left / center / right)
- [x] Page Structure / Headings Navigator
- [x] Highlight Hover toggle
- [x] Image Tooltips (show alt text on hover; keyboard-focus support added in v1.5.1)

**Files to modify:**
- `src/types.ts` — Add `readingMask`, `textAlignment`, `highlightHover`, `imageTooltips` types
- `src/useAccessibilitySettings.ts` — State + DOM manipulation for reading mask overlay and hover effects
- `src/accessibility.css` — Reading mask overlay styles, text alignment classes, hover highlight styles
- `src/AccessibilityWidget.tsx` — New controls in the Reading tab + headings navigator panel

### v1.4.0 — Profiles & Presets — Shipped

- [x] Seizure-Safe Profile (one-click)
- [x] ADHD-Friendly Profile (one-click)
- [x] Vision Impaired Profile (one-click)
- [x] Mute Sounds toggle
- [x] Multi-language widget UI (shipped with 13 languages in v1.5.0, not just Spanish + French)

**Files to modify:**
- `src/types.ts` — Add profile types and `muteSounds`, `language` settings
- `src/useAccessibilitySettings.ts` — Profile presets that set multiple settings at once, audio muting logic
- `src/accessibility.css` — Any additional styles for profiles
- `src/AccessibilityWidget.tsx` — Profiles section in UI, language selector, mute toggle
- New: `src/i18n/` directory with translation files (en.json, es.json, fr.json)

---

## Implementation Pattern

Each new feature follows the same pattern as existing features:

1. Add the setting type to `AccessibilitySettings` in `src/types.ts`
2. Add state management in `src/useAccessibilitySettings.ts` (default value, body class toggle, localStorage persistence)
3. Add CSS class rules in `src/accessibility.css`
4. Add UI toggle/control in `src/AccessibilityWidget.tsx` under the appropriate tab
5. Build, bump version, push tag to trigger release
