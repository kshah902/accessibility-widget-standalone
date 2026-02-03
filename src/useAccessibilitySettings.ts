'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  TextSize,
  AccessibilitySettings,
  ColorBlindnessMode,
  BooleanSettingKey,
} from './types'

const defaultSettings: AccessibilitySettings = {
  // Original settings
  textSize: '100',
  highContrast: false,
  reduceMotion: false,
  highlightLinks: false,
  lineHeight: false,
  dyslexiaFont: false,
  bigCursor: false,
  readingGuide: false,
  // New settings
  colorBlindnessMode: 'none',
  focusIndicator: {
    enabled: false,
    thickness: '4px',
    color: '#E5B94E',
    style: 'solid',
  },
  ttsEnabled: false,
  ttsRate: 1.0,
}

const STORAGE_KEY = 'a11y-settings'

// Class mappings for each setting
const classMap: Record<string, string | ((value: any) => string) | null> = {
  textSize: (value: TextSize) => (value !== '100' ? `a11y-text-${value}` : ''),
  highContrast: 'a11y-high-contrast',
  reduceMotion: 'a11y-reduce-motion',
  highlightLinks: 'a11y-highlight-links',
  lineHeight: 'a11y-line-height',
  dyslexiaFont: 'a11y-dyslexia-font',
  bigCursor: 'a11y-big-cursor',
  readingGuide: 'a11y-reading-guide',
  colorBlindnessMode: (value: ColorBlindnessMode) =>
    value !== 'none' ? `a11y-${value}` : '',
  focusIndicator: null, // Handled separately with CSS variables
  ttsEnabled: null, // No class needed
  ttsRate: null, // No class needed
}

// Announcement messages for screen readers
const getAnnouncementMessage = (
  key: string,
  value: any,
  prevValue?: any
): string => {
  switch (key) {
    case 'textSize':
      return `Text size changed to ${value} percent`
    case 'highContrast':
      return value ? 'High contrast enabled' : 'High contrast disabled'
    case 'reduceMotion':
      return value ? 'Animations reduced' : 'Animations restored'
    case 'highlightLinks':
      return value ? 'Links highlighted' : 'Link highlighting disabled'
    case 'lineHeight':
      return value ? 'Line height increased' : 'Line height reset'
    case 'dyslexiaFont':
      return value ? 'Dyslexia-friendly font enabled' : 'Default font restored'
    case 'bigCursor':
      return value ? 'Large cursor enabled' : 'Default cursor restored'
    case 'readingGuide':
      return value ? 'Reading guide enabled' : 'Reading guide disabled'
    case 'colorBlindnessMode':
      if (value === 'none') return 'Color blindness filter disabled'
      return `${value} color blindness filter enabled`
    case 'focusIndicator':
      return value?.enabled
        ? 'Custom focus indicator enabled'
        : 'Default focus indicator restored'
    case 'ttsEnabled':
      return value ? 'Text-to-speech enabled' : 'Text-to-speech disabled'
    default:
      return ''
  }
}

interface UseAccessibilitySettingsOptions {
  onAnnounce?: (message: string) => void
}

export function useAccessibilitySettings(
  options: UseAccessibilitySettingsOptions = {}
) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const prevSettingsRef = useRef<AccessibilitySettings>(defaultSettings)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to handle new settings
        const merged = {
          ...defaultSettings,
          ...parsed,
          focusIndicator: {
            ...defaultSettings.focusIndicator,
            ...(parsed.focusIndicator || {}),
          },
        }
        setSettings(merged)
        prevSettingsRef.current = merged
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error)
    }
    setIsLoaded(true)
  }, [])

  // Apply classes and CSS variables when settings change
  useEffect(() => {
    if (!isLoaded) return

    const body = document.body

    // Remove all accessibility classes first
    body.classList.forEach((cls) => {
      if (cls.startsWith('a11y-')) {
        body.classList.remove(cls)
      }
    })

    // Apply new classes based on settings
    Object.entries(settings).forEach(([key, value]) => {
      const classConfig = classMap[key]

      if (classConfig === null) return // Skip settings without classes

      if (typeof classConfig === 'function') {
        const className = classConfig(value)
        if (className) {
          body.classList.add(className)
        }
      } else if (value === true && classConfig) {
        body.classList.add(classConfig)
      }
    })

    // Apply focus indicator CSS variables
    if (settings.focusIndicator.enabled) {
      body.classList.add('a11y-focus-custom')
      body.style.setProperty(
        '--a11y-focus-thickness',
        settings.focusIndicator.thickness
      )
      body.style.setProperty('--a11y-focus-color', settings.focusIndicator.color)
      body.style.setProperty('--a11y-focus-style', settings.focusIndicator.style)
    } else {
      body.style.removeProperty('--a11y-focus-thickness')
      body.style.removeProperty('--a11y-focus-color')
      body.style.removeProperty('--a11y-focus-style')
    }

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save accessibility settings:', error)
    }

    // Generate announcement for changed settings
    const prevSettings = prevSettingsRef.current
    Object.keys(settings).forEach((key) => {
      const currentValue = settings[key as keyof AccessibilitySettings]
      const prevValue = prevSettings[key as keyof AccessibilitySettings]

      if (JSON.stringify(currentValue) !== JSON.stringify(prevValue)) {
        const message = getAnnouncementMessage(key, currentValue, prevValue)
        if (message) {
          setAnnouncement(message)
          options.onAnnounce?.(message)
        }
      }
    })

    prevSettingsRef.current = settings
  }, [settings, isLoaded, options])

  // Clear announcement after delay
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 1000)
      return () => clearTimeout(timer)
    }
  }, [announcement])

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K]
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    setAnnouncement('All accessibility settings reset')
  }, [])

  const toggleSetting = useCallback((key: BooleanSettingKey) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const updateFocusIndicator = useCallback(
    (updates: Partial<AccessibilitySettings['focusIndicator']>) => {
      setSettings((prev) => ({
        ...prev,
        focusIndicator: { ...prev.focusIndicator, ...updates },
      }))
    },
    []
  )

  const setColorBlindnessMode = useCallback((mode: ColorBlindnessMode) => {
    setSettings((prev) => ({ ...prev, colorBlindnessMode: mode }))
  }, [])

  const setTTSRate = useCallback((rate: number) => {
    setSettings((prev) => ({ ...prev, ttsRate: Math.max(0.5, Math.min(2.0, rate)) }))
  }, [])

  return {
    settings,
    updateSetting,
    resetSettings,
    toggleSetting,
    updateFocusIndicator,
    setColorBlindnessMode,
    setTTSRate,
    isLoaded,
    announcement,
  }
}

// Keyboard shortcuts hook - to be used in the widget
export function useAccessibilityKeyboardShortcuts(
  togglePanel: () => void,
  toggleSetting: (key: BooleanSettingKey) => void,
  resetSettings: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger with Alt key
      if (!e.altKey) return

      // Don't trigger in input fields
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      switch (e.code) {
        case 'KeyA':
          e.preventDefault()
          togglePanel()
          break
        case 'KeyC':
          e.preventDefault()
          toggleSetting('highContrast')
          break
        case 'KeyM':
          e.preventDefault()
          toggleSetting('reduceMotion')
          break
        case 'KeyR':
          e.preventDefault()
          resetSettings()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, togglePanel, toggleSetting, resetSettings])
}

// Text-to-speech hook
export function useTextToSpeech(enabled: boolean, rate: number = 1.0) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback(
    (text: string) => {
      if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) {
        return
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = rate
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [enabled, rate]
  )

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
    }
  }, [])

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
  }
}
