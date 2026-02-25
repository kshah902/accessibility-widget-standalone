# Akby Accessibility Widget — Feature Roadmap

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

### v1.2.0 — Display & Visual Enhancements

- [ ] Dark Mode toggle
- [ ] Text Spacing control (letter-spacing + word-spacing)
- [ ] Monochrome / Desaturate toggle
- [ ] Saturation control (low / high)
- [ ] Hide Images toggle

**Files to modify:**
- `src/types.ts` — Add `darkMode`, `textSpacing`, `monochrome`, `saturation`, `hideImages` to `AccessibilitySettings`
- `src/useAccessibilitySettings.ts` — State management + body class toggles for each new setting
- `src/accessibility.css` — CSS rules for dark mode, monochrome filter, text spacing, image hiding
- `src/AccessibilityWidget.tsx` — New toggles in the Display tab

### v1.3.0 — Reading & Navigation Enhancements

- [ ] Reading Mask (spotlight mode)
- [ ] Text Alignment control (left / center / right)
- [ ] Page Structure / Headings Navigator
- [ ] Highlight Hover toggle
- [ ] Image Tooltips (show alt text on hover)

**Files to modify:**
- `src/types.ts` — Add `readingMask`, `textAlignment`, `highlightHover`, `imageTooltips` types
- `src/useAccessibilitySettings.ts` — State + DOM manipulation for reading mask overlay and hover effects
- `src/accessibility.css` — Reading mask overlay styles, text alignment classes, hover highlight styles
- `src/AccessibilityWidget.tsx` — New controls in the Reading tab + headings navigator panel

### v1.4.0 — Profiles & Presets

- [ ] Seizure-Safe Profile (one-click)
- [ ] ADHD-Friendly Profile (one-click)
- [ ] Vision Impaired Profile (one-click)
- [ ] Mute Sounds toggle
- [ ] Multi-language widget UI (start with Spanish + French)

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
