# Accessibility Widget (Standalone)

A comprehensive accessibility widget that works on **any website** - WordPress, Squarespace, Wix, plain HTML, or any platform that allows custom scripts.

## Features

- **Text Size** - Adjust text size (100%, 125%, 150%, 175%)
- **High Contrast** - Increase color contrast for better visibility
- **Reduce Motion** - Stop animations for users sensitive to motion
- **Highlight Links** - Make links more visible
- **Line Height** - Increase text spacing for easier reading
- **Dyslexia Font** - Use OpenDyslexic font
- **Big Cursor** - Enlarge mouse cursor
- **Reading Guide** - Line that follows your cursor
- **Color Blindness Filters** - Protanopia, Deuteranopia, Tritanopia simulation
- **Custom Focus Indicators** - Enhanced focus outlines
- **Text-to-Speech** - Read selected text aloud
- **Keyboard Shortcuts** - Quick access (Option/Alt + A, C, M, R)

## Installation

### Option 1: Script Tag (Any Website)

Add these two lines before the closing `</body>` tag:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@1.0.0/dist/accessibility.css">
<script src="https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@1.0.0/dist/standalone.global.js"></script>
```

### Option 2: WordPress Plugin

1. Download the plugin from the `wordpress-plugin` folder
2. Upload to your WordPress site (Plugins > Add New > Upload Plugin)
3. Activate the plugin
4. The widget will appear on your site automatically

### Option 3: Download and Self-Host

1. Download the `dist` folder
2. Host `accessibility.css` and `standalone.global.js` on your server
3. Add the script and link tags pointing to your hosted files

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Option/Alt + A** | Toggle accessibility panel |
| **Option/Alt + C** | Toggle high contrast |
| **Option/Alt + M** | Toggle reduce motion |
| **Option/Alt + R** | Reset all settings |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## For React/Next.js Projects

If you're using React or Next.js, use the main package instead:

```bash
npm install @krunalshah/accessibility-widget
```

See [@krunalshah/accessibility-widget](https://github.com/kshah902/accessibility-widget) for React documentation.

## License

MIT
