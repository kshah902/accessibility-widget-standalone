'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  useAccessibilitySettings,
  useAccessibilityKeyboardShortcuts,
  useTextToSpeech,
} from './useAccessibilitySettings'
import type { TextSize, ColorBlindnessMode } from './types'

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

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [mouseY, setMouseY] = useState(0)
  const [activeTab, setActiveTab] = useState<'display' | 'vision' | 'reading'>('display')
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
    isLoaded,
    announcement,
  } = useAccessibilitySettings()

  const { speak, stop, isSpeaking } = useTextToSpeech(
    settings.ttsEnabled,
    settings.ttsRate
  )

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

  // Reading guide - track mouse position
  useEffect(() => {
    if (!settings.readingGuide) return

    function handleMouseMove(event: MouseEvent) {
      setMouseY(event.clientY)
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [settings.readingGuide])

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

  const textSizes: { value: TextSize; label: string }[] = [
    { value: '100', label: '100%' },
    { value: '125', label: '125%' },
    { value: '150', label: '150%' },
    { value: '175', label: '175%' },
  ]

  const colorBlindnessModes: { value: ColorBlindnessMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'protanopia', label: 'Protanopia' },
    { value: 'deuteranopia', label: 'Deuteranopia' },
    { value: 'tritanopia', label: 'Tritanopia' },
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

      {/* Widget Container */}
      <div className={styles.container}>
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          className={styles.trigger}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-controls="a11y-panel"
          aria-label={isOpen ? `Close accessibility settings (${modKey}+A)` : `Open accessibility settings (${modKey}+A)`}
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
            aria-label="Accessibility settings"
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Accessibility</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close accessibility settings"
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
                Display
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'vision'}
                className={`${styles.tab} ${activeTab === 'vision' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('vision')}
              >
                Vision
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'reading'}
                className={`${styles.tab} ${activeTab === 'reading' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('reading')}
              >
                Reading
              </button>
            </div>

            <div className={styles.content}>
              {/* Display Tab */}
              {activeTab === 'display' && (
                <>
                  {/* Text Size */}
                  <div className={styles.section}>
                    <label className={styles.label}>Text Size</label>
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
                      label="High Contrast"
                      description={`Increase color contrast (${modKey}+C)`}
                      checked={settings.highContrast}
                      onChange={() => toggleSetting('highContrast')}
                      icon={<ContrastIcon />}
                    />

                    <ToggleOption
                      label="Reduce Motion"
                      description={`Stop animations (${modKey}+M)`}
                      checked={settings.reduceMotion}
                      onChange={() => toggleSetting('reduceMotion')}
                      icon={<MotionIcon />}
                    />

                    <ToggleOption
                      label="Big Cursor"
                      description="Enlarge mouse cursor"
                      checked={settings.bigCursor}
                      onChange={() => toggleSetting('bigCursor')}
                      icon={<CursorIcon />}
                    />

                    <ToggleOption
                      label="Custom Focus"
                      description="Enhanced focus indicators"
                      checked={settings.focusIndicator.enabled}
                      onChange={() =>
                        updateFocusIndicator({ enabled: !settings.focusIndicator.enabled })
                      }
                      icon={<FocusIcon />}
                    />
                  </div>
                </>
              )}

              {/* Vision Tab */}
              {activeTab === 'vision' && (
                <>
                  {/* Color Blindness Mode */}
                  <div className={styles.section}>
                    <label className={styles.label}>Color Blindness Filter</label>
                    <div className={styles.selectWrapper}>
                      <select
                        className={styles.select}
                        value={settings.colorBlindnessMode}
                        onChange={(e) =>
                          setColorBlindnessMode(e.target.value as ColorBlindnessMode)
                        }
                        aria-label="Color blindness simulation mode"
                      >
                        {colorBlindnessModes.map((mode) => (
                          <option key={mode.value} value={mode.value}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className={styles.hint}>
                      Simulates how colors appear to people with color vision deficiency
                    </p>
                  </div>

                  {/* Vision Toggles */}
                  <div className={styles.toggles}>
                    <ToggleOption
                      label="Highlight Links"
                      description="Make links more visible"
                      checked={settings.highlightLinks}
                      onChange={() => toggleSetting('highlightLinks')}
                      icon={<LinkIcon />}
                    />
                  </div>
                </>
              )}

              {/* Reading Tab */}
              {activeTab === 'reading' && (
                <>
                  {/* Reading Toggles */}
                  <div className={styles.toggles}>
                    <ToggleOption
                      label="Line Height"
                      description="Increase text spacing"
                      checked={settings.lineHeight}
                      onChange={() => toggleSetting('lineHeight')}
                      icon={<LineHeightIcon />}
                    />

                    <ToggleOption
                      label="Dyslexia Font"
                      description="Use OpenDyslexic font"
                      checked={settings.dyslexiaFont}
                      onChange={() => toggleSetting('dyslexiaFont')}
                      icon={<FontIcon />}
                    />

                    <ToggleOption
                      label="Reading Guide"
                      description="Line follows cursor"
                      checked={settings.readingGuide}
                      onChange={() => toggleSetting('readingGuide')}
                      icon={<GuideIcon />}
                    />

                    <ToggleOption
                      label="Text-to-Speech"
                      description="Read selected text aloud"
                      checked={settings.ttsEnabled}
                      onChange={() => toggleSetting('ttsEnabled')}
                      icon={<SpeakerIcon />}
                    />
                  </div>

                  {/* TTS Controls */}
                  {settings.ttsEnabled && (
                    <div className={styles.section}>
                      <label className={styles.label}>Speech Rate</label>
                      <div className={styles.sliderWrapper}>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={settings.ttsRate}
                          onChange={(e) => setTTSRate(parseFloat(e.target.value))}
                          className={styles.slider}
                          aria-label="Speech rate"
                        />
                        <span className={styles.sliderValue}>{settings.ttsRate}x</span>
                      </div>
                      <div className={styles.ttsButtons}>
                        <button
                          className={styles.ttsButton}
                          onClick={handleReadSelection}
                          disabled={isSpeaking}
                        >
                          {isSpeaking ? 'Speaking...' : 'Read Selection'}
                        </button>
                        {isSpeaking && (
                          <button className={styles.ttsButton} onClick={stop}>
                            Stop
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <button className={styles.resetButton} onClick={resetSettings}>
                Reset All ({modKey}+R)
              </button>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className={styles.shortcuts}>
              <span>Shortcuts: {modKey}+A (panel) {modKey}+C (contrast) {modKey}+M (motion) {modKey}+R (reset)</span>
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

// Icons
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
