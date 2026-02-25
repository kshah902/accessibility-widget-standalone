'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  useAccessibilitySettings,
  useAccessibilityKeyboardShortcuts,
  useTextToSpeech,
  useMuteSounds,
  useImageTooltips,
  useDictionary,
  useVoiceCommands,
  useAltTextDetection,
  useAutoRemediation,
} from './useAccessibilitySettings'
import type {
  TextSize,
  TextSpacing,
  SaturationLevel,
  TextAlignment,
  ColorBlindnessMode,
  WidgetLanguage,
} from './types'
import { createTranslator } from './i18n'

// CSS class names - using plain strings since CSS modules don't work with tsup
const styles = {
  container: 'a11y-widget-container',
  trigger: 'a11y-widget-trigger',
  panel: 'a11y-widget-panel',
  header: 'a11y-widget-header',
  title: 'a11y-widget-title',
  closeButton: 'a11y-widget-closeButton',
  tabs: 'a11y-widget-tabs',
  tab: 'a11y-widget-tab',
  tabActive: 'a11y-widget-tabActive',
  content: 'a11y-widget-content',
  section: 'a11y-widget-section',
  label: 'a11y-widget-label',
  textSizeButtons: 'a11y-widget-textSizeButtons',
  textSizeButton: 'a11y-widget-textSizeButton',
  active: 'a11y-widget-active',
  toggles: 'a11y-widget-toggles',
  toggleOption: 'a11y-widget-toggleOption',
  toggleInfo: 'a11y-widget-toggleInfo',
  toggleIcon: 'a11y-widget-toggleIcon',
  toggleLabel: 'a11y-widget-toggleLabel',
  toggleDescription: 'a11y-widget-toggleDescription',
  toggle: 'a11y-widget-toggle',
  toggleOn: 'a11y-widget-toggleOn',
  toggleThumb: 'a11y-widget-toggleThumb',
  selectWrapper: 'a11y-widget-selectWrapper',
  select: 'a11y-widget-select',
  hint: 'a11y-widget-hint',
  sliderWrapper: 'a11y-widget-sliderWrapper',
  slider: 'a11y-widget-slider',
  sliderValue: 'a11y-widget-sliderValue',
  ttsButtons: 'a11y-widget-ttsButtons',
  ttsButton: 'a11y-widget-ttsButton',
  footer: 'a11y-widget-footer',
  resetButton: 'a11y-widget-resetButton',
  shortcuts: 'a11y-widget-shortcuts',
}

// SVG Filters for Color Blindness Simulation
function ColorBlindnessFilters() {
  return (
    <svg
      style={{ position: 'absolute', width: 0, height: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Protanopia (red-blind) filter */}
        <filter id="a11y-protanopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.567, 0.433, 0,     0, 0
                    0.558, 0.442, 0,     0, 0
                    0,     0.242, 0.758, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>
        {/* Deuteranopia (green-blind) filter */}
        <filter id="a11y-deuteranopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.625, 0.375, 0,   0, 0
                    0.7,   0.3,   0,   0, 0
                    0,     0.3,   0.7, 0, 0
                    0,     0,     0,   1, 0"
          />
        </filter>
        {/* Tritanopia (blue-blind) filter */}
        <filter id="a11y-tritanopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.95, 0.05,  0,     0, 0
                    0,    0.433, 0.567, 0, 0
                    0,    0.475, 0.525, 0, 0
                    0,    0,     0,     1, 0"
          />
        </filter>
      </defs>
    </svg>
  )
}

// Screen Reader Announcements
function Announcer({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="a11y-sr-only"
    >
      {message}
    </div>
  )
}

// Headings Navigator Component
function HeadingsNavigator({
  onBack,
  t,
}: {
  onBack: () => void
  t: (key: string) => string
}) {
  const [headings, setHeadings] = useState<
    { level: number; text: string; element: HTMLElement }[]
  >([])

  useEffect(() => {
    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const list = Array.from(elements)
      .filter((el) => !el.closest('#a11y-widget-portal'))
      .map((el) => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent?.trim() || '',
        element: el as HTMLElement,
      }))
      .filter((h) => h.text.length > 0)
    setHeadings(list)
  }, [])

  const jumpTo = (element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    element.focus()
  }

  return (
    <>
      <button className="a11y-widget-back-button" onClick={onBack}>
        ← {t('back')}
      </button>
      {headings.length === 0 ? (
        <p className={styles.hint} style={{ padding: '16px' }}>
          {t('noHeadings')}
        </p>
      ) : (
        <ul className="a11y-widget-headings-list" role="list">
          {headings.map((h, i) => (
            <li key={i}>
              <button
                className="a11y-widget-heading-item"
                data-level={h.level}
                onClick={() => jumpTo(h.element)}
              >
                <span className="a11y-widget-heading-level">H{h.level}</span>
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// Links Navigator Component
function LinksNavigator({
  onBack,
  t,
}: {
  onBack: () => void
  t: (key: string) => string
}) {
  const [links, setLinks] = useState<{ text: string; href: string; element: HTMLElement }[]>([])

  useEffect(() => {
    const seen = new Set<string>()
    const result: { text: string; href: string; element: HTMLElement }[] = []
    const selectors = 'nav a, [role="navigation"] a, footer a, a[href^="#"], [role="banner"] a'
    document.querySelectorAll(selectors).forEach((el) => {
      if (el.closest('#a11y-widget-portal')) return
      const a = el as HTMLAnchorElement
      const href = a.getAttribute('href') || ''
      if (!href || seen.has(href)) return
      seen.add(href)
      const text = a.textContent?.trim() || href
      result.push({ text, href, element: a })
    })
    setLinks(result)
  }, [])

  const jumpTo = (element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    element.focus()
  }

  return (
    <>
      <button className="a11y-widget-back-button" onClick={onBack}>
        ← {t('back')}
      </button>
      {links.length === 0 ? (
        <p className={styles.hint} style={{ padding: '16px' }}>{t('noLinks')}</p>
      ) : (
        <ul className="a11y-widget-headings-list" role="list">
          {links.map((link, i) => (
            <li key={i}>
              <button className="a11y-widget-heading-item" onClick={() => jumpTo(link.element)}>
                {link.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// Virtual Keyboard Component
function VirtualKeyboard() {
  const [isShift, setIsShift] = useState(false)

  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ]

  const typeKey = useCallback(
    (key: string) => {
      const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        const start = active.selectionStart ?? active.value.length
        const end = active.selectionEnd ?? active.value.length
        const char = isShift ? key.toUpperCase() : key
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          active.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
          'value'
        )?.set
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(active, active.value.slice(0, start) + char + active.value.slice(end))
          active.selectionStart = active.selectionEnd = start + 1
          active.dispatchEvent(new Event('input', { bubbles: true }))
        }
        if (isShift) setIsShift(false)
      }
    },
    [isShift]
  )

  const handleBackspace = useCallback(() => {
    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      const start = active.selectionStart ?? active.value.length
      const end = active.selectionEnd ?? active.value.length
      if (start === end && start > 0) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          active.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
          'value'
        )?.set
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(active, active.value.slice(0, start - 1) + active.value.slice(end))
          active.selectionStart = active.selectionEnd = start - 1
          active.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
    }
  }, [])

  const handleEnter = useCallback(() => {
    const active = document.activeElement as HTMLTextAreaElement
    if (active && active.tagName === 'TEXTAREA') {
      typeKey('\n')
    } else if (active && active.tagName === 'INPUT') {
      const form = active.closest('form')
      if (form) form.requestSubmit()
    }
  }, [typeKey])

  return (
    <div className="a11y-virtual-keyboard" role="toolbar" aria-label="Virtual keyboard">
      {rows.map((row, ri) => (
        <div key={ri} className="a11y-vk-row">
          {ri === 3 && (
            <button
              className={`a11y-vk-key a11y-vk-wide${isShift ? ' a11y-widget-active' : ''}`}
              onClick={() => setIsShift(!isShift)}
            >
              Shift
            </button>
          )}
          {row.map((key) => (
            <button
              key={key}
              className="a11y-vk-key"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => typeKey(key)}
            >
              {isShift ? key.toUpperCase() : key}
            </button>
          ))}
          {ri === 3 && (
            <button className="a11y-vk-key a11y-vk-wide" onMouseDown={(e) => e.preventDefault()} onClick={handleBackspace}>
              ←
            </button>
          )}
        </div>
      ))}
      <div className="a11y-vk-row">
        <button className="a11y-vk-key a11y-vk-space" onMouseDown={(e) => e.preventDefault()} onClick={() => typeKey(' ')}>
          Space
        </button>
        <button className="a11y-vk-key a11y-vk-wide" onMouseDown={(e) => e.preventDefault()} onClick={handleEnter}>
          Enter
        </button>
      </div>
    </div>
  )
}

// Accessibility Statement Modal
function AccessibilityStatementModal({
  onClose,
  t,
}: {
  onClose: () => void
  t: (key: string) => string
}) {
  const [copied, setCopied] = useState(false)
  const domain = typeof window !== 'undefined' ? window.location.hostname : 'example.com'
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const statementText = `Accessibility Statement for ${domain}

Last updated: ${date}

We are committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

Measures taken:
- We use the Akby Accessibility Widget to provide accessibility tools
- We aim to conform to WCAG 2.1 Level AA
- We regularly test our website for accessibility issues
- We provide multiple ways to navigate and interact with our content

Accessibility features available:
- Text size adjustment (100% to 175%)
- High contrast and dark mode
- Color blindness filters
- Dyslexia-friendly and readable fonts
- Reading guide and reading mask
- Text-to-speech
- Keyboard navigation support
- Reduced motion mode
- Image tooltips and link highlighting
- Virtual keyboard and voice commands

If you encounter any accessibility barriers on our website, please contact us. We take accessibility feedback seriously and will address concerns promptly.`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(statementText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = statementText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="a11y-statement-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="a11y-statement-modal">
        <div className="a11y-statement-header">
          <h2>{t('accessibilityStatement')}</h2>
          <button className="a11y-statement-close" onClick={onClose}>×</button>
        </div>
        <div className="a11y-statement-content">
          <h3>Accessibility Statement for {domain}</h3>
          <p><em>Last updated: {date}</em></p>
          <p>We are committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.</p>
          <h3>Measures Taken</h3>
          <ul>
            <li>We use the Akby Accessibility Widget to provide accessibility tools</li>
            <li>We aim to conform to WCAG 2.1 Level AA</li>
            <li>We regularly test our website for accessibility issues</li>
            <li>We provide multiple ways to navigate and interact with our content</li>
          </ul>
          <h3>Accessibility Features Available</h3>
          <ul>
            <li>Text size adjustment (100% to 175%)</li>
            <li>High contrast and dark mode</li>
            <li>Color blindness filters</li>
            <li>Dyslexia-friendly and readable fonts</li>
            <li>Reading guide and reading mask</li>
            <li>Text-to-speech</li>
            <li>Keyboard navigation support</li>
            <li>Reduced motion mode</li>
            <li>Virtual keyboard and voice commands</li>
          </ul>
          <p>If you encounter any accessibility barriers on our website, please contact us.</p>
        </div>
        <div className="a11y-statement-footer">
          <button
            className={`a11y-statement-copy${copied ? ' a11y-copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? t('copied') : t('copyToClipboard')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Compliance Report Modal
interface ReportIssue {
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  message: string
  count: number
}

function ComplianceReportModal({
  onClose,
  t,
}: {
  onClose: () => void
  t: (key: string) => string
}) {
  const [issues, setIssues] = useState<ReportIssue[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const found: ReportIssue[] = []

    // Check missing alt text
    const missingAlt = document.querySelectorAll('img:not([alt]), img[alt=""]').length
    if (missingAlt > 0) {
      found.push({ severity: 'critical', message: 'Images missing alt text', count: missingAlt })
    }

    // Check missing form labels
    const missingLabels = document.querySelectorAll(
      'input:not([aria-label]):not([aria-labelledby]):not([id]), input[id]:not(:has(~label[for])), select:not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby])'
    ).length
    if (missingLabels > 0) {
      found.push({ severity: 'serious', message: 'Form inputs missing labels', count: missingLabels })
    }

    // Check empty buttons
    const emptyButtons = Array.from(document.querySelectorAll('button')).filter(
      (btn) => !btn.textContent?.trim() && !btn.getAttribute('aria-label') && !btn.querySelector('img[alt]')
    ).length
    if (emptyButtons > 0) {
      found.push({ severity: 'serious', message: 'Buttons with no accessible name', count: emptyButtons })
    }

    // Check empty links
    const emptyLinks = Array.from(document.querySelectorAll('a[href]')).filter(
      (a) => !a.textContent?.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]')
    ).length
    if (emptyLinks > 0) {
      found.push({ severity: 'serious', message: 'Links with no accessible name', count: emptyLinks })
    }

    // Check heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .filter((el) => !el.closest('#a11y-widget-portal'))
    let headingIssues = 0
    for (let i = 1; i < headings.length; i++) {
      const prev = parseInt(headings[i - 1].tagName[1])
      const curr = parseInt(headings[i].tagName[1])
      if (curr > prev + 1) headingIssues++
    }
    if (headingIssues > 0) {
      found.push({ severity: 'moderate', message: 'Heading hierarchy skipped levels', count: headingIssues })
    }

    // Check missing lang
    if (!document.documentElement.getAttribute('lang')) {
      found.push({ severity: 'serious', message: 'Page missing lang attribute on <html>', count: 1 })
    }

    // Check missing skip link
    const firstLink = document.querySelector('a[href]') as HTMLAnchorElement
    const hasSkipLink = firstLink && firstLink.getAttribute('href')?.startsWith('#')
    if (!hasSkipLink) {
      found.push({ severity: 'moderate', message: 'No skip navigation link found', count: 1 })
    }

    // Check for h1
    const h1Count = document.querySelectorAll('h1').length
    if (h1Count === 0) {
      found.push({ severity: 'moderate', message: 'Page has no H1 heading', count: 1 })
    } else if (h1Count > 1) {
      found.push({ severity: 'minor', message: 'Page has multiple H1 headings', count: h1Count })
    }

    setIssues(found)
  }, [])

  const totalIssues = issues.reduce((sum, i) => sum + i.count, 0)

  const handleCopy = async () => {
    const text = `Accessibility Compliance Report - ${window.location.hostname}\nDate: ${new Date().toLocaleDateString()}\n\nTotal issues: ${totalIssues}\n\n${issues.map((i) => `[${i.severity.toUpperCase()}] ${i.message} (${i.count})`).join('\n')}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="a11y-statement-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="a11y-statement-modal">
        <div className="a11y-statement-header">
          <h2>{t('complianceReport')}</h2>
          <button className="a11y-statement-close" onClick={onClose}>×</button>
        </div>
        <div className="a11y-statement-content">
          <div className="a11y-report-summary">
            <div className="a11y-report-stat">
              <span className="a11y-report-stat-number">{totalIssues}</span>
              <span className="a11y-report-stat-label">{t('issuesFound')}</span>
            </div>
            <div className="a11y-report-stat">
              <span className="a11y-report-stat-number">{issues.filter((i) => i.severity === 'critical').length}</span>
              <span className="a11y-report-stat-label">{t('critical')}</span>
            </div>
            <div className="a11y-report-stat">
              <span className="a11y-report-stat-number">{issues.filter((i) => i.severity === 'serious').length}</span>
              <span className="a11y-report-stat-label">{t('serious')}</span>
            </div>
          </div>
          {issues.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#059669' }}>No accessibility issues detected.</p>
          ) : (
            <div className="a11y-report-issues">
              {issues.map((issue, i) => (
                <div key={i} className="a11y-report-issue">
                  <span className={`a11y-report-severity a11y-severity-${issue.severity}`}>
                    {t(issue.severity)}
                  </span>
                  <span className="a11y-report-text">{issue.message}</span>
                  <span className="a11y-report-count">×{issue.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="a11y-statement-footer">
          <button
            className={`a11y-statement-copy${copied ? ' a11y-copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? t('copied') : t('copyToClipboard')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [mouseY, setMouseY] = useState(0)
  const [activeTab, setActiveTab] = useState<
    'display' | 'vision' | 'reading' | 'profiles'
  >('display')
  const [showHeadings, setShowHeadings] = useState(false)
  const [showUsefulLinks, setShowUsefulLinks] = useState(false)
  const [showStatement, setShowStatement] = useState(false)
  const [showComplianceReport, setShowComplianceReport] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [isMac, setIsMac] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Detect if user is on Mac for keyboard shortcut labels
  useEffect(() => {
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform))
  }, [])

  // Create portal container outside body to avoid filter stacking context issues
  useEffect(() => {
    const container = document.createElement('div')
    container.id = 'a11y-widget-portal'
    // Append to documentElement (html) to be outside body and its filters
    document.documentElement.appendChild(container)
    setPortalContainer(container)

    return () => {
      if (document.documentElement.contains(container)) {
        document.documentElement.removeChild(container)
      }
    }
  }, [])

  const {
    settings,
    updateSetting,
    toggleSetting,
    resetSettings,
    setColorBlindnessMode,
    updateFocusIndicator,
    setTTSRate,
    setTextSpacing,
    setSaturationLevel,
    setTextAlignment,
    setLanguage,
    setCustomTextColor,
    setCustomTitleColor,
    setCustomBgColor,
    applyProfile,
    isLoaded,
    announcement,
  } = useAccessibilitySettings()

  const { speak, stop, isSpeaking } = useTextToSpeech(
    settings.ttsEnabled,
    settings.ttsRate
  )

  // Activate feature hooks
  useMuteSounds(settings.muteSounds)
  useImageTooltips(settings.imageTooltips)
  useDictionary(settings.dictionaryEnabled)
  const { isListening, isSupported: voiceSupported } = useVoiceCommands(settings.voiceCommands)
  const { count: altTextIssueCount } = useAltTextDetection(settings.altTextDetection)
  const { fixCount: remediationFixCount } = useAutoRemediation(settings.autoRemediation)

  // i18n
  const t = createTranslator(settings.language)

  // Keyboard shortcuts
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  useAccessibilityKeyboardShortcuts(
    handleToggle,
    toggleSetting,
    resetSettings,
    true
  )

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        triggerRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle Escape key to close
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Reading guide / reading mask - track mouse position
  useEffect(() => {
    if (!settings.readingGuide && !settings.readingMask) return

    function handleMouseMove(event: MouseEvent) {
      setMouseY(event.clientY)
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [settings.readingGuide, settings.readingMask])

  // Focus trap for panel
  useEffect(() => {
    if (!isOpen || !panelRef.current) return

    const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    function handleTab(event: KeyboardEvent) {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    firstElement?.focus()

    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  // Read selected text
  const handleReadSelection = useCallback(() => {
    const selection = window.getSelection()?.toString()
    if (selection) {
      speak(selection)
    } else {
      speak('No text selected. Select some text on the page to read it aloud.')
    }
  }, [speak])

  // Mutual exclusivity: readable font ↔ dyslexia font
  const handleToggleReadableFont = useCallback(() => {
    if (!settings.readableFont) {
      // Enabling readable font — disable dyslexia font
      updateSetting('readableFont', true)
      if (settings.dyslexiaFont) updateSetting('dyslexiaFont', false)
    } else {
      updateSetting('readableFont', false)
    }
  }, [settings.readableFont, settings.dyslexiaFont, updateSetting])

  const handleToggleDyslexiaFont = useCallback(() => {
    if (!settings.dyslexiaFont) {
      // Enabling dyslexia font — disable readable font
      updateSetting('dyslexiaFont', true)
      if (settings.readableFont) updateSetting('readableFont', false)
    } else {
      updateSetting('dyslexiaFont', false)
    }
  }, [settings.dyslexiaFont, settings.readableFont, updateSetting])

  const textSizes: { value: TextSize; label: string }[] = [
    { value: '100', label: '100%' },
    { value: '125', label: '125%' },
    { value: '150', label: '150%' },
    { value: '175', label: '175%' },
  ]

  // Keyboard shortcut modifier key label (⌥ for Mac, Alt for others)
  const modKey = isMac ? '⌥' : 'Alt'

  if (!isLoaded || !portalContainer) return null

  // Render via portal to document.documentElement to avoid body filter issues
  const widgetContent = (
    <>
      {/* Color Blindness SVG Filters */}
      <ColorBlindnessFilters />

      {/* Screen Reader Announcements */}
      <Announcer message={announcement} />

      {/* Reading Guide Overlay */}
      {settings.readingGuide && (
        <div
          className="a11y-reading-guide-line"
          style={{ top: mouseY - 20 }}
          aria-hidden="true"
        />
      )}

      {/* Reading Mask Overlay */}
      {settings.readingMask && (
        <>
          <div
            className="a11y-reading-mask-overlay"
            style={{ top: 0, height: Math.max(0, mouseY - 50) }}
            aria-hidden="true"
          />
          <div
            className="a11y-reading-mask-overlay"
            style={{ top: mouseY + 50, bottom: 0 }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Virtual Keyboard */}
      {settings.virtualKeyboard && <VirtualKeyboard />}

      {/* Voice Commands Indicator */}
      {settings.voiceCommands && isListening && (
        <div className="a11y-voice-indicator">
          <span className="a11y-voice-dot" />
          {t('listening')}
        </div>
      )}

      {/* Accessibility Statement Modal */}
      {showStatement && (
        <AccessibilityStatementModal onClose={() => setShowStatement(false)} t={t} />
      )}

      {/* Compliance Report Modal */}
      {showComplianceReport && (
        <ComplianceReportModal onClose={() => setShowComplianceReport(false)} t={t} />
      )}

      {/* Widget Container */}
      <div className={styles.container}>
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          className={styles.trigger}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-controls="a11y-panel"
          aria-label={
            isOpen
              ? `${t('closeSettings')} (${modKey}+A)`
              : `${t('openSettings')} (${modKey}+A)`
          }
        >
          <AccessibilityIcon />
        </button>

        {/* Settings Panel */}
        {isOpen && (
          <div
            ref={panelRef}
            id="a11y-panel"
            className={styles.panel}
            role="dialog"
            aria-label={t('accessibility')}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>{t('accessibility')}</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label={t('closeSettings')}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabs} role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'display'}
                className={`${styles.tab} ${activeTab === 'display' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('display')}
              >
                {t('display')}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'vision'}
                className={`${styles.tab} ${activeTab === 'vision' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('vision')}
              >
                {t('vision')}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'reading'}
                className={`${styles.tab} ${activeTab === 'reading' ? styles.tabActive : ''}`}
                onClick={() => {
                  setActiveTab('reading')
                  setShowHeadings(false)
                  setShowUsefulLinks(false)
                }}
              >
                {t('reading')}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'profiles'}
                className={`${styles.tab} ${activeTab === 'profiles' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('profiles')}
              >
                {t('profiles')}
              </button>
            </div>

            <div className={styles.content}>
              {/* Display Tab */}
              {activeTab === 'display' && (
                <>
                  {/* Text Size */}
                  <div className={styles.section}>
                    <label className={styles.label}>{t('textSize')}</label>
                    <div className={styles.textSizeButtons}>
                      {textSizes.map((size) => (
                        <button
                          key={size.value}
                          className={`${styles.textSizeButton} ${
                            settings.textSize === size.value ? styles.active : ''
                          }`}
                          onClick={() => updateSetting('textSize', size.value)}
                          aria-pressed={settings.textSize === size.value}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Display Toggles */}
                  <div className={styles.toggles}>
                    <ToggleOption
                      label={t('highContrast')}
                      description={`${t('highContrastDesc')} (${modKey}+C)`}
                      checked={settings.highContrast}
                      onChange={() => toggleSetting('highContrast')}
                      icon={<ContrastIcon />}
                    />

                    <ToggleOption
                      label={t('reduceMotion')}
                      description={`${t('reduceMotionDesc')} (${modKey}+M)`}
                      checked={settings.reduceMotion}
                      onChange={() => toggleSetting('reduceMotion')}
                      icon={<MotionIcon />}
                    />

                    <ToggleOption
                      label={t('bigCursor')}
                      description={t('bigCursorDesc')}
                      checked={settings.bigCursor}
                      onChange={() => toggleSetting('bigCursor')}
                      icon={<CursorIcon />}
                    />

                    <ToggleOption
                      label={t('customFocus')}
                      description={t('customFocusDesc')}
                      checked={settings.focusIndicator.enabled}
                      onChange={() =>
                        updateFocusIndicator({ enabled: !settings.focusIndicator.enabled })
                      }
                      icon={<FocusIcon />}
                    />

                    <ToggleOption
                      label={t('darkMode')}
                      description={t('darkModeDesc')}
                      checked={settings.darkMode}
                      onChange={() => toggleSetting('darkMode')}
                      icon={<DarkModeIcon />}
                    />

                    <ToggleOption
                      label={t('monochrome')}
                      description={t('monochromeDesc')}
                      checked={settings.monochrome}
                      onChange={() => toggleSetting('monochrome')}
                      icon={<MonochromeIcon />}
                    />
                  </div>

                  {/* Text Spacing */}
                  <div className={styles.section}>
                    <label className={styles.label}>{t('textSpacing')}</label>
                    <div className={styles.selectWrapper}>
                      <select
                        className={styles.select}
                        value={settings.textSpacing}
                        onChange={(e) =>
                          setTextSpacing(e.target.value as TextSpacing)
                        }
                        aria-label={t('textSpacingLabel')}
                      >
                        <option value="normal">{t('normal')}</option>
                        <option value="wide">{t('wide')}</option>
                        <option value="wider">{t('wider')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Saturation */}
                  <div className={styles.section}>
                    <label className={styles.label}>{t('saturation')}</label>
                    <div className={styles.selectWrapper}>
                      <select
                        className={styles.select}
                        value={settings.saturationLevel}
                        onChange={(e) =>
                          setSaturationLevel(e.target.value as SaturationLevel)
                        }
                        aria-label={t('saturationLabel')}
                      >
                        <option value="low">{t('low')}</option>
                        <option value="normal">{t('normal')}</option>
                        <option value="high">{t('high')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div className={styles.section}>
                    <label className={styles.label}>{t('customColors')}</label>
                    <div className="a11y-widget-color-pickers">
                      <div className="a11y-widget-color-picker-item">
                        <label>{t('textColor')}</label>
                        <input
                          type="color"
                          value={settings.customTextColor || '#000000'}
                          onChange={(e) => setCustomTextColor(e.target.value)}
                          aria-label={t('textColor')}
                        />
                        {settings.customTextColor && (
                          <button
                            className="a11y-widget-color-reset"
                            onClick={() => setCustomTextColor('')}
                          >
                            {t('resetColor')}
                          </button>
                        )}
                      </div>
                      <div className="a11y-widget-color-picker-item">
                        <label>{t('titleColor')}</label>
                        <input
                          type="color"
                          value={settings.customTitleColor || '#000000'}
                          onChange={(e) => setCustomTitleColor(e.target.value)}
                          aria-label={t('titleColor')}
                        />
                        {settings.customTitleColor && (
                          <button
                            className="a11y-widget-color-reset"
                            onClick={() => setCustomTitleColor('')}
                          >
                            {t('resetColor')}
                          </button>
                        )}
                      </div>
                      <div className="a11y-widget-color-picker-item">
                        <label>{t('bgColor')}</label>
                        <input
                          type="color"
                          value={settings.customBgColor || '#ffffff'}
                          onChange={(e) => setCustomBgColor(e.target.value)}
                          aria-label={t('bgColor')}
                        />
                        {settings.customBgColor && (
                          <button
                            className="a11y-widget-color-reset"
                            onClick={() => setCustomBgColor('')}
                          >
                            {t('resetColor')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Vision Tab */}
              {activeTab === 'vision' && (
                <>
                  {/* Color Blindness Mode */}
                  <div className={styles.section}>
                    <label className={styles.label}>{t('colorBlindness')}</label>
                    <div className={styles.selectWrapper}>
                      <select
                        className={styles.select}
                        value={settings.colorBlindnessMode}
                        onChange={(e) =>
                          setColorBlindnessMode(
                            e.target.value as ColorBlindnessMode
                          )
                        }
                        aria-label={t('colorBlindnessLabel')}
                      >
                        <option value="none">{t('none')}</option>
                        <option value="protanopia">{t('protanopia')}</option>
                        <option value="deuteranopia">{t('deuteranopia')}</option>
                        <option value="tritanopia">{t('tritanopia')}</option>
                      </select>
                    </div>
                    <p className={styles.hint}>{t('colorBlindnessHint')}</p>
                  </div>

                  {/* Vision Toggles */}
                  <div className={styles.toggles}>
                    <ToggleOption
                      label={t('highlightLinks')}
                      description={t('highlightLinksDesc')}
                      checked={settings.highlightLinks}
                      onChange={() => toggleSetting('highlightLinks')}
                      icon={<LinkIcon />}
                    />

                    <ToggleOption
                      label={t('hideImages')}
                      description={t('hideImagesDesc')}
                      checked={settings.hideImages}
                      onChange={() => toggleSetting('hideImages')}
                      icon={<HideImagesIcon />}
                    />

                    <ToggleOption
                      label={t('highlightHover')}
                      description={t('highlightHoverDesc')}
                      checked={settings.highlightHover}
                      onChange={() => toggleSetting('highlightHover')}
                      icon={<HoverIcon />}
                    />

                    <ToggleOption
                      label={t('imageTooltips')}
                      description={t('imageTooltipsDesc')}
                      checked={settings.imageTooltips}
                      onChange={() => toggleSetting('imageTooltips')}
                      icon={<TooltipIcon />}
                    />

                    <ToggleOption
                      label={t('altTextDetection')}
                      description={`${t('altTextDetectionDesc')}${settings.altTextDetection && altTextIssueCount > 0 ? ` (${altTextIssueCount} ${t('issuesFound')})` : ''}`}
                      checked={settings.altTextDetection}
                      onChange={() => toggleSetting('altTextDetection')}
                      icon={<AltTextIcon />}
                    />
                  </div>
                </>
              )}

              {/* Reading Tab */}
              {activeTab === 'reading' && !showHeadings && !showUsefulLinks && (
                <>
                  {/* Reading Toggles */}
                  <div className={styles.toggles}>
                    <ToggleOption
                      label={t('lineHeight')}
                      description={t('lineHeightDesc')}
                      checked={settings.lineHeight}
                      onChange={() => toggleSetting('lineHeight')}
                      icon={<LineHeightIcon />}
                    />

                    <ToggleOption
                      label={t('dyslexiaFont')}
                      description={t('dyslexiaFontDesc')}
                      checked={settings.dyslexiaFont}
                      onChange={handleToggleDyslexiaFont}
                      icon={<FontIcon />}
                    />

                    <ToggleOption
                      label={t('readingGuide')}
                      description={t('readingGuideDesc')}
                      checked={settings.readingGuide}
                      onChange={() => toggleSetting('readingGuide')}
                      icon={<GuideIcon />}
                    />

                    <ToggleOption
                      label={t('readingMask')}
                      description={t('readingMaskDesc')}
                      checked={settings.readingMask}
                      onChange={() => toggleSetting('readingMask')}
                      icon={<MaskIcon />}
                    />

                    <ToggleOption
                      label={t('readableFont')}
                      description={t('readableFontDesc')}
                      checked={settings.readableFont}
                      onChange={handleToggleReadableFont}
                      icon={<ReadableFontIcon />}
                    />

                    <ToggleOption
                      label={t('dictionary')}
                      description={t('dictionaryDesc')}
                      checked={settings.dictionaryEnabled}
                      onChange={() => toggleSetting('dictionaryEnabled')}
                      icon={<DictionaryIcon />}
                    />

                    <ToggleOption
                      label={t('tts')}
                      description={t('ttsDesc')}
                      checked={settings.ttsEnabled}
                      onChange={() => toggleSetting('ttsEnabled')}
                      icon={<SpeakerIcon />}
                    />
                  </div>

                  {/* TTS Controls */}
                  {settings.ttsEnabled && (
                    <div className={styles.section}>
                      <label className={styles.label}>{t('speechRate')}</label>
                      <div className={styles.sliderWrapper}>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={settings.ttsRate}
                          onChange={(e) => setTTSRate(parseFloat(e.target.value))}
                          className={styles.slider}
                          aria-label={t('speechRate')}
                        />
                        <span className={styles.sliderValue}>
                          {settings.ttsRate}x
                        </span>
                      </div>
                      <div className={styles.ttsButtons}>
                        <button
                          className={styles.ttsButton}
                          onClick={handleReadSelection}
                          disabled={isSpeaking}
                        >
                          {isSpeaking ? t('speaking') : t('readSelection')}
                        </button>
                        {isSpeaking && (
                          <button className={styles.ttsButton} onClick={stop}>
                            {t('stop')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Text Alignment */}
                  <div className={styles.section}>
                    <label className={styles.label}>{t('textAlignment')}</label>
                    <div className={styles.textSizeButtons}>
                      {(
                        ['default', 'left', 'center', 'right'] as TextAlignment[]
                      ).map((align) => (
                        <button
                          key={align}
                          className={`${styles.textSizeButton} ${
                            settings.textAlignment === align ? styles.active : ''
                          }`}
                          onClick={() => setTextAlignment(align)}
                          aria-pressed={settings.textAlignment === align}
                        >
                          {t(align)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page Structure & Useful Links Buttons */}
                  <div className="a11y-widget-button-row">
                    <button onClick={() => { setShowHeadings(true); setShowUsefulLinks(false) }}>
                      {t('pageStructure')}
                    </button>
                    <button onClick={() => { setShowUsefulLinks(true); setShowHeadings(false) }}>
                      {t('usefulLinks')}
                    </button>
                  </div>
                </>
              )}

              {/* Headings Navigator */}
              {activeTab === 'reading' && showHeadings && (
                <HeadingsNavigator
                  onBack={() => setShowHeadings(false)}
                  t={t}
                />
              )}

              {/* Links Navigator */}
              {activeTab === 'reading' && showUsefulLinks && (
                <LinksNavigator
                  onBack={() => setShowUsefulLinks(false)}
                  t={t}
                />
              )}

              {/* Profiles Tab */}
              {activeTab === 'profiles' && (
                <>
                  <div className="a11y-widget-profiles">
                    <button className="a11y-widget-profile-button" onClick={() => applyProfile('seizureSafe')}>
                      <span className="a11y-widget-profile-icon"><SeizureSafeIcon /></span>
                      <div className="a11y-widget-profile-text">
                        <span className="a11y-widget-profile-label">{t('seizureSafe')}</span>
                        <span className="a11y-widget-profile-desc">{t('seizureSafeDesc')}</span>
                      </div>
                    </button>
                    <button className="a11y-widget-profile-button" onClick={() => applyProfile('adhdFriendly')}>
                      <span className="a11y-widget-profile-icon"><ADHDIcon /></span>
                      <div className="a11y-widget-profile-text">
                        <span className="a11y-widget-profile-label">{t('adhdFriendly')}</span>
                        <span className="a11y-widget-profile-desc">{t('adhdFriendlyDesc')}</span>
                      </div>
                    </button>
                    <button className="a11y-widget-profile-button" onClick={() => applyProfile('visionImpaired')}>
                      <span className="a11y-widget-profile-icon"><VisionImpairedIcon /></span>
                      <div className="a11y-widget-profile-text">
                        <span className="a11y-widget-profile-label">{t('visionImpaired')}</span>
                        <span className="a11y-widget-profile-desc">{t('visionImpairedDesc')}</span>
                      </div>
                    </button>
                    <button className="a11y-widget-profile-button" onClick={() => applyProfile('cognitiveDisability')}>
                      <span className="a11y-widget-profile-icon"><CognitiveIcon /></span>
                      <div className="a11y-widget-profile-text">
                        <span className="a11y-widget-profile-label">{t('cognitiveDisability')}</span>
                        <span className="a11y-widget-profile-desc">{t('cognitiveDisabilityDesc')}</span>
                      </div>
                    </button>
                    <button className="a11y-widget-profile-button" onClick={() => applyProfile('keyboardNavigation')}>
                      <span className="a11y-widget-profile-icon"><KeyboardIcon /></span>
                      <div className="a11y-widget-profile-text">
                        <span className="a11y-widget-profile-label">{t('keyboardNavigation')}</span>
                        <span className="a11y-widget-profile-desc">{t('keyboardNavigationDesc')}</span>
                      </div>
                    </button>
                    <button className="a11y-widget-profile-button" onClick={() => applyProfile('screenReader')}>
                      <span className="a11y-widget-profile-icon"><SpeakerIcon /></span>
                      <div className="a11y-widget-profile-text">
                        <span className="a11y-widget-profile-label">{t('screenReader')}</span>
                        <span className="a11y-widget-profile-desc">{t('screenReaderDesc')}</span>
                      </div>
                    </button>
                  </div>

                  <div className={styles.toggles} style={{ marginTop: '16px' }}>
                    <ToggleOption
                      label={t('muteSounds')}
                      description={t('muteSoundsDesc')}
                      checked={settings.muteSounds}
                      onChange={() => toggleSetting('muteSounds')}
                      icon={<MuteIcon />}
                    />
                    <ToggleOption
                      label={t('virtualKeyboard')}
                      description={t('virtualKeyboardDesc')}
                      checked={settings.virtualKeyboard}
                      onChange={() => toggleSetting('virtualKeyboard')}
                      icon={<KeyboardIcon />}
                    />
                    <ToggleOption
                      label={t('voiceCommands')}
                      description={voiceSupported ? t('voiceCommandsDesc') : t('voiceNotSupported')}
                      checked={settings.voiceCommands}
                      onChange={() => voiceSupported && toggleSetting('voiceCommands')}
                      icon={<VoiceIcon />}
                    />
                    <ToggleOption
                      label={t('autoRemediation')}
                      description={`${t('autoRemediationDesc')}${settings.autoRemediation && remediationFixCount > 0 ? ` (${remediationFixCount} ${t('fixesApplied')})` : ''}`}
                      checked={settings.autoRemediation}
                      onChange={() => toggleSetting('autoRemediation')}
                      icon={<WrenchIcon />}
                    />
                  </div>

                  {/* Statement & Report Buttons */}
                  <div className="a11y-widget-button-row" style={{ marginTop: '12px' }}>
                    <button onClick={() => setShowStatement(true)}>
                      <ReportIcon />
                      {t('accessibilityStatement')}
                    </button>
                    <button onClick={() => setShowComplianceReport(true)}>
                      <ReportIcon />
                      {t('complianceReport')}
                    </button>
                  </div>

                  {/* Language Selector */}
                  <div className={styles.section} style={{ marginTop: '16px' }}>
                    <label className={styles.label}>{t('widgetLanguage')}</label>
                    <div className={styles.selectWrapper}>
                      <select
                        className={styles.select}
                        value={settings.language}
                        onChange={(e) => setLanguage(e.target.value as WidgetLanguage)}
                        aria-label={t('widgetLanguageLabel')}
                      >
                        <option value="en">English</option>
                        <option value="es">Espanol</option>
                        <option value="fr">Francais</option>
                        <option value="de">Deutsch</option>
                        <option value="it">Italiano</option>
                        <option value="pt">Portugues</option>
                        <option value="zh">中文</option>
                        <option value="ja">日本語</option>
                        <option value="ko">한국어</option>
                        <option value="ar">العربية</option>
                        <option value="hi">हिन्दी</option>
                        <option value="bn">বাংলা</option>
                        <option value="ru">Русский</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <button className={styles.resetButton} onClick={resetSettings}>
                {t('resetAll')} ({modKey}+R)
              </button>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className={styles.shortcuts}>
              <span>
                {modKey}+A (panel) {modKey}+C (contrast) {modKey}+M (motion){' '}
                {modKey}+R (reset)
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return createPortal(widgetContent, portalContainer)
}

// Toggle Option Component
interface ToggleOptionProps {
  label: string
  description: string
  checked: boolean
  onChange: () => void
  icon: React.ReactNode
}

function ToggleOption({ label, description, checked, onChange, icon }: ToggleOptionProps) {
  const id = `a11y-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className={styles.toggleOption}>
      <div className={styles.toggleInfo}>
        <span className={styles.toggleIcon} aria-hidden="true">
          {icon}
        </span>
        <div>
          <label htmlFor={id} className={styles.toggleLabel}>
            {label}
          </label>
          <p className={styles.toggleDescription}>{description}</p>
        </div>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
        onClick={onChange}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}

// =========================================================================
// Icons
// =========================================================================

function AccessibilityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="8" r="2" />
      <path d="M12 10v8" />
      <path d="M8 14h8" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ContrastIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20" />
      <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
    </svg>
  )
}

function MotionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function LineHeightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function FontIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4,7 4,4 20,4 20,7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  )
}

function CursorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
    </svg>
  )
}

function GuideIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
    </svg>
  )
}

function FocusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

// New icons for v1.2.0+

function DarkModeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MonochromeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

function HideImagesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

function HoverIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
      <rect x="14" y="14" width="8" height="8" rx="1" strokeDasharray="2 2" />
    </svg>
  )
}

function TooltipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function MaskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="7" fill="currentColor" opacity="0.2" />
      <rect x="2" y="15" width="20" height="7" fill="currentColor" opacity="0.2" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="2" y1="15" x2="22" y2="15" />
    </svg>
  )
}

function SeizureSafeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ADHDIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C8 2 4.5 5.5 4.5 9.5c0 3 1.5 5.5 4 7v2.5h7v-2.5c2.5-1.5 4-4 4-7C19.5 5.5 16 2 12 2z" />
      <line x1="9" y1="21" x2="15" y2="21" />
      <line x1="10" y1="14" x2="10" y2="11" />
      <line x1="14" y1="14" x2="14" y2="11" />
    </svg>
  )
}

function VisionImpairedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function MuteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

// v1.5.0 Icons

function ReadableFontIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
      <circle cx="12" cy="12" r="0" fill="currentColor" />
      <path d="M7 12h10" />
    </svg>
  )
}

function DictionaryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </svg>
  )
}

function CognitiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 9h.01" />
      <path d="M16 9h.01" />
      <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.001" />
      <path d="M10 8h.001" />
      <path d="M14 8h.001" />
      <path d="M18 8h.001" />
      <path d="M8 12h.001" />
      <path d="M12 12h.001" />
      <path d="M16 12h.001" />
      <path d="M7 16h10" />
    </svg>
  )
}

function VoiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function AltTextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
      <path d="M14 14l1-1 3 3" />
    </svg>
  )
}

function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
