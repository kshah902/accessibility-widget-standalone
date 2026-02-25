'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  TextSize,
  TextSpacing,
  SaturationLevel,
  TextAlignment,
  WidgetLanguage,
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
  colorBlindnessMode: 'none',
  focusIndicator: {
    enabled: false,
    thickness: '4px',
    color: '#E5B94E',
    style: 'solid',
  },
  ttsEnabled: false,
  ttsRate: 1.0,

  // v1.2.0
  darkMode: false,
  textSpacing: 'normal',
  monochrome: false,
  saturationLevel: 'normal',
  hideImages: false,

  // v1.3.0
  readingMask: false,
  textAlignment: 'default',
  highlightHover: false,
  imageTooltips: false,

  // v1.4.0
  muteSounds: false,
  language: 'en',

  // v1.5.0
  readableFont: false,
  customTextColor: '',
  customTitleColor: '',
  customBgColor: '',
  dictionaryEnabled: false,
  virtualKeyboard: false,
  voiceCommands: false,
  altTextDetection: false,
  autoRemediation: false,
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
  colorBlindnessMode: null, // Handled imperatively (filter stacking)
  focusIndicator: null, // Handled separately with CSS variables
  ttsEnabled: null, // No class needed
  ttsRate: null, // No class needed

  // v1.2.0
  darkMode: 'a11y-dark-mode',
  textSpacing: (value: TextSpacing) =>
    value !== 'normal' ? `a11y-text-spacing-${value}` : '',
  monochrome: null, // Handled imperatively (filter stacking)
  saturationLevel: null, // Handled imperatively (filter stacking)
  hideImages: 'a11y-hide-images',

  // v1.3.0
  readingMask: null, // No body class needed, overlay is rendered in component
  textAlignment: (value: TextAlignment) =>
    value !== 'default' ? `a11y-text-align-${value}` : '',
  highlightHover: 'a11y-highlight-hover',
  imageTooltips: null, // Handled via JS event listeners

  // v1.4.0
  muteSounds: null, // Handled via JS
  language: null, // UI-only

  // v1.5.0
  readableFont: 'a11y-readable-font',
  customTextColor: null, // Handled imperatively via CSS variables
  customTitleColor: null,
  customBgColor: null,
  dictionaryEnabled: null, // Handled via JS hook
  virtualKeyboard: null, // UI-only
  voiceCommands: null, // Handled via JS hook
  altTextDetection: null, // Handled via JS hook
  autoRemediation: null, // Handled via JS hook
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

    // v1.2.0
    case 'darkMode':
      return value ? 'Dark mode enabled' : 'Dark mode disabled'
    case 'textSpacing':
      if (value === 'normal') return 'Text spacing reset to normal'
      return `Text spacing set to ${value}`
    case 'monochrome':
      return value ? 'Monochrome mode enabled' : 'Monochrome mode disabled'
    case 'saturationLevel':
      if (value === 'normal') return 'Saturation reset to normal'
      return `Saturation set to ${value}`
    case 'hideImages':
      return value ? 'Images hidden' : 'Images visible'

    // v1.3.0
    case 'readingMask':
      return value ? 'Reading mask enabled' : 'Reading mask disabled'
    case 'textAlignment':
      if (value === 'default') return 'Text alignment reset to default'
      return `Text alignment set to ${value}`
    case 'highlightHover':
      return value ? 'Hover highlight enabled' : 'Hover highlight disabled'
    case 'imageTooltips':
      return value ? 'Image tooltips enabled' : 'Image tooltips disabled'

    // v1.4.0
    case 'muteSounds':
      return value ? 'All sounds muted' : 'Sounds unmuted'
    case 'language': {
      const langNames: Record<string, string> = {
        en: 'English',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        it: 'Italian',
        pt: 'Portuguese',
        zh: 'Chinese',
        ja: 'Japanese',
        ko: 'Korean',
        ar: 'Arabic',
        hi: 'Hindi',
        bn: 'Bengali',
        ru: 'Russian',
      }
      return `Widget language changed to ${langNames[value as string] || value}`
    }

    // v1.5.0
    case 'readableFont':
      return value ? 'Readable font enabled' : 'Readable font disabled'
    case 'customTextColor':
      return value ? 'Custom text color applied' : 'Text color reset'
    case 'customTitleColor':
      return value ? 'Custom title color applied' : 'Title color reset'
    case 'customBgColor':
      return value ? 'Custom background color applied' : 'Background color reset'
    case 'dictionaryEnabled':
      return value ? 'Dictionary enabled' : 'Dictionary disabled'
    case 'virtualKeyboard':
      return value ? 'Virtual keyboard enabled' : 'Virtual keyboard disabled'
    case 'voiceCommands':
      return value ? 'Voice commands enabled' : 'Voice commands disabled'
    case 'altTextDetection':
      return value ? 'Alt text detection enabled' : 'Alt text detection disabled'
    case 'autoRemediation':
      return value ? 'Auto-remediation enabled' : 'Auto-remediation disabled'

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

    // Imperative filter management (monochrome, saturation, color blindness)
    const filters: string[] = []
    if (settings.monochrome) {
      filters.push('grayscale(100%)')
    } else {
      if (settings.saturationLevel === 'low') filters.push('saturate(0.5)')
      if (settings.saturationLevel === 'high') filters.push('saturate(1.8)')
    }
    if (settings.colorBlindnessMode !== 'none') {
      filters.push(`url('#a11y-${settings.colorBlindnessMode}-filter')`)
    }
    body.style.filter = filters.length ? filters.join(' ') : ''

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

    // Apply custom color CSS variables
    if (settings.customTextColor) {
      body.classList.add('a11y-custom-text-color')
      body.style.setProperty('--a11y-custom-text-color', settings.customTextColor)
    } else {
      body.classList.remove('a11y-custom-text-color')
      body.style.removeProperty('--a11y-custom-text-color')
    }
    if (settings.customTitleColor) {
      body.classList.add('a11y-custom-title-color')
      body.style.setProperty('--a11y-custom-title-color', settings.customTitleColor)
    } else {
      body.classList.remove('a11y-custom-title-color')
      body.style.removeProperty('--a11y-custom-title-color')
    }
    if (settings.customBgColor) {
      body.classList.add('a11y-custom-bg-color')
      body.style.setProperty('--a11y-custom-bg-color', settings.customBgColor)
    } else {
      body.classList.remove('a11y-custom-bg-color')
      body.style.removeProperty('--a11y-custom-bg-color')
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

  const setTextSpacing = useCallback((spacing: TextSpacing) => {
    setSettings((prev) => ({ ...prev, textSpacing: spacing }))
  }, [])

  const setSaturationLevel = useCallback((level: SaturationLevel) => {
    setSettings((prev) => ({ ...prev, saturationLevel: level }))
  }, [])

  const setTextAlignment = useCallback((alignment: TextAlignment) => {
    setSettings((prev) => ({ ...prev, textAlignment: alignment }))
  }, [])

  const setLanguage = useCallback((lang: WidgetLanguage) => {
    setSettings((prev) => ({ ...prev, language: lang }))
  }, [])

  const setCustomTextColor = useCallback((color: string) => {
    setSettings((prev) => ({ ...prev, customTextColor: color }))
  }, [])

  const setCustomTitleColor = useCallback((color: string) => {
    setSettings((prev) => ({ ...prev, customTitleColor: color }))
  }, [])

  const setCustomBgColor = useCallback((color: string) => {
    setSettings((prev) => ({ ...prev, customBgColor: color }))
  }, [])

  const applyProfile = useCallback(
    (profile: 'seizureSafe' | 'adhdFriendly' | 'visionImpaired' | 'cognitiveDisability' | 'keyboardNavigation' | 'screenReader') => {
      setSettings((prev) => {
        switch (profile) {
          case 'seizureSafe':
            return {
              ...prev,
              reduceMotion: true,
              highContrast: true,
              saturationLevel: 'low' as SaturationLevel,
            }
          case 'adhdFriendly':
            return {
              ...prev,
              reduceMotion: true,
              readingMask: true,
              highlightHover: true,
            }
          case 'visionImpaired':
            return {
              ...prev,
              textSize: '150' as TextSize,
              highContrast: true,
              highlightLinks: true,
              bigCursor: true,
            }
          case 'cognitiveDisability':
            return {
              ...prev,
              readableFont: true,
              dyslexiaFont: false,
              highlightLinks: true,
              lineHeight: true,
              textSpacing: 'wide' as TextSpacing,
            }
          case 'keyboardNavigation':
            return {
              ...prev,
              focusIndicator: { ...prev.focusIndicator, enabled: true },
              highlightLinks: true,
              highlightHover: true,
            }
          case 'screenReader':
            return {
              ...prev,
              ttsEnabled: true,
              imageTooltips: true,
              readingGuide: true,
            }
        }
      })
    },
    []
  )

  return {
    settings,
    updateSetting,
    resetSettings,
    toggleSetting,
    updateFocusIndicator,
    setColorBlindnessMode,
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

// Mute sounds hook
export function useMuteSounds(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const muteAll = () => {
      document.querySelectorAll('audio, video').forEach((el) => {
        ;(el as HTMLMediaElement).muted = true
      })
    }

    muteAll()

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLMediaElement) {
            node.muted = true
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll('audio, video').forEach((el) => {
              ;(el as HTMLMediaElement).muted = true
            })
          }
        })
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      document.querySelectorAll('audio, video').forEach((el) => {
        ;(el as HTMLMediaElement).muted = false
      })
    }
  }, [enabled])
}

// Dictionary hook
export function useDictionary(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let popup: HTMLElement | null = null

    function removePopup() {
      if (popup) {
        popup.remove()
        popup = null
      }
    }

    function handleClick(e: MouseEvent) {
      removePopup()

      // Don't trigger on widget elements
      const target = e.target as HTMLElement
      if (target.closest('.a11y-widget-container') || target.closest('#a11y-widget-portal')) return

      // Get word at click point
      let word = ''
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY)
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          const textContent = range.startContainer.textContent || ''
          const offset = range.startOffset
          // Find word boundaries
          let start = offset
          let end = offset
          while (start > 0 && /[a-zA-Z'-]/.test(textContent[start - 1])) start--
          while (end < textContent.length && /[a-zA-Z'-]/.test(textContent[end])) end++
          word = textContent.slice(start, end).trim()
        }
      } else {
        const sel = window.getSelection()
        if (sel && sel.toString().trim()) {
          word = sel.toString().trim()
        }
      }

      if (!word || word.length < 2 || word.length > 30 || /[^a-zA-Z'-]/.test(word)) return

      // Fetch definition
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not found')
          return res.json()
        })
        .then((data) => {
          if (!Array.isArray(data) || data.length === 0) return
          const entry = data[0]
          const meaning = entry.meanings?.[0]
          const def = meaning?.definitions?.[0]?.definition || 'No definition found'
          const partOfSpeech = meaning?.partOfSpeech || ''
          const phonetic = entry.phonetic || ''

          popup = document.createElement('div')
          popup.className = 'a11y-dictionary-popup'
          popup.innerHTML = `<strong>${entry.word}</strong>${phonetic ? ` <em>${phonetic}</em>` : ''}${partOfSpeech ? `<br><small>${partOfSpeech}</small>` : ''}<br>${def}`
          document.body.appendChild(popup)

          // Position near click
          const rect = popup.getBoundingClientRect()
          let top = e.clientY + 10
          let left = e.clientX
          if (top + rect.height > window.innerHeight) top = e.clientY - rect.height - 10
          if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 8
          popup.style.top = `${top}px`
          popup.style.left = `${left}px`
        })
        .catch(() => {})
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') removePopup()
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
      removePopup()
    }
  }, [enabled])
}

// Voice commands hook
export function useVoiceCommands(enabled: boolean) {
  const [isListening, setIsListening] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  const recognitionRef = useRef<any>(null)

  const isSupported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

  useEffect(() => {
    if (!enabled || !isSupported) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
        setIsListening(false)
      }
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1]
      if (!last.isFinal) return
      const transcript = last[0].transcript.toLowerCase().trim()
      setLastCommand(transcript)

      if (transcript.includes('scroll down')) window.scrollBy(0, 300)
      else if (transcript.includes('scroll up')) window.scrollBy(0, -300)
      else if (transcript.includes('go to top')) window.scrollTo(0, 0)
      else if (transcript.includes('go to bottom')) window.scrollTo(0, document.body.scrollHeight)
      else if (transcript.includes('click')) {
        const target = transcript.replace('click', '').trim()
        if (target) {
          const links = document.querySelectorAll('a, button')
          for (const el of links) {
            if ((el as HTMLElement).textContent?.toLowerCase().includes(target)) {
              (el as HTMLElement).click()
              break
            }
          }
        }
      } else if (transcript.includes('next link')) {
        const links = Array.from(document.querySelectorAll('a[href]'))
        const active = document.activeElement
        const idx = links.indexOf(active as Element)
        const next = links[idx + 1] || links[0]
        if (next) (next as HTMLElement).focus()
      } else if (transcript.includes('previous link')) {
        const links = Array.from(document.querySelectorAll('a[href]'))
        const active = document.activeElement
        const idx = links.indexOf(active as Element)
        const prev = links[idx - 1] || links[links.length - 1]
        if (prev) (prev as HTMLElement).focus()
      }
    }

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => {
      // Auto-restart if still enabled
      if (enabled) {
        try { recognition.start() } catch (_) {}
      } else {
        setIsListening(false)
      }
    }
    recognition.onerror = () => {}

    try { recognition.start() } catch (_) {}
    recognitionRef.current = recognition

    return () => {
      recognition.onend = null
      recognition.stop()
      recognitionRef.current = null
      setIsListening(false)
    }
  }, [enabled, isSupported])

  return { isListening, lastCommand, isSupported }
}

// Alt text detection hook
export function useAltTextDetection(enabled: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) {
      // Clean up
      document.querySelectorAll('.a11y-missing-alt').forEach((el) => {
        el.classList.remove('a11y-missing-alt')
      })
      document.querySelectorAll('.a11y-missing-alt-label').forEach((el) => el.remove())
      setCount(0)
      return
    }

    const images = document.querySelectorAll('img:not([alt]), img[alt=""]')
    setCount(images.length)

    images.forEach((img) => {
      img.classList.add('a11y-missing-alt')
      // Add warning label
      const label = document.createElement('div')
      label.className = 'a11y-missing-alt-label'
      label.textContent = 'No alt text'
      label.setAttribute('aria-hidden', 'true')
      img.parentElement?.style.setProperty('position', 'relative')
      img.parentElement?.appendChild(label)
    })

    return () => {
      document.querySelectorAll('.a11y-missing-alt').forEach((el) => {
        el.classList.remove('a11y-missing-alt')
      })
      document.querySelectorAll('.a11y-missing-alt-label').forEach((el) => el.remove())
      setCount(0)
    }
  }, [enabled])

  return { count }
}

// Auto-remediation hook
export function useAutoRemediation(enabled: boolean) {
  const [fixCount, setFixCount] = useState(0)

  useEffect(() => {
    if (!enabled) {
      // Revert fixes
      document.querySelectorAll('[data-a11y-fixed]').forEach((el) => {
        const fixes = el.getAttribute('data-a11y-fixed')?.split(',') || []
        fixes.forEach((fix) => {
          if (fix === 'role') el.removeAttribute('role')
          if (fix === 'tabindex') el.removeAttribute('tabindex')
          if (fix === 'aria-label') el.removeAttribute('aria-label')
        })
        el.removeAttribute('data-a11y-fixed')
      })
      if (!document.documentElement.getAttribute('data-a11y-fixed')) {
        // Only remove lang if we added it
      }
      setFixCount(0)
      return
    }

    let fixes = 0

    // Fix clickable divs/spans missing role="button"
    document.querySelectorAll('div[onclick], span[onclick]').forEach((el) => {
      if (!el.getAttribute('role')) {
        el.setAttribute('role', 'button')
        el.setAttribute('tabindex', '0')
        const prev = el.getAttribute('data-a11y-fixed')
        el.setAttribute('data-a11y-fixed', prev ? `${prev},role,tabindex` : 'role,tabindex')
        fixes++
      }
    })

    // Fix empty buttons missing aria-label
    document.querySelectorAll('button:not([aria-label])').forEach((el) => {
      if (!el.textContent?.trim() && !el.querySelector('img[alt]')) {
        el.setAttribute('aria-label', 'Button')
        const prev = el.getAttribute('data-a11y-fixed')
        el.setAttribute('data-a11y-fixed', prev ? `${prev},aria-label` : 'aria-label')
        fixes++
      }
    })

    // Fix empty links missing aria-label
    document.querySelectorAll('a:not([aria-label])').forEach((el) => {
      if (!el.textContent?.trim() && !el.querySelector('img[alt]')) {
        el.setAttribute('aria-label', 'Link')
        const prev = el.getAttribute('data-a11y-fixed')
        el.setAttribute('data-a11y-fixed', prev ? `${prev},aria-label` : 'aria-label')
        fixes++
      }
    })

    // Fix missing lang attribute on html
    if (!document.documentElement.getAttribute('lang')) {
      document.documentElement.setAttribute('lang', 'en')
      document.documentElement.setAttribute('data-a11y-fixed', 'lang')
      fixes++
    }

    // Fix missing role="main" on main content
    if (!document.querySelector('[role="main"], main')) {
      const candidates = document.querySelectorAll('#main, #content, .main, .content')
      if (candidates.length > 0) {
        candidates[0].setAttribute('role', 'main')
        const prev = candidates[0].getAttribute('data-a11y-fixed')
        candidates[0].setAttribute('data-a11y-fixed', prev ? `${prev},role` : 'role')
        fixes++
      }
    }

    setFixCount(fixes)

    return () => {
      document.querySelectorAll('[data-a11y-fixed]').forEach((el) => {
        const fixList = el.getAttribute('data-a11y-fixed')?.split(',') || []
        fixList.forEach((fix) => {
          if (fix === 'role') el.removeAttribute('role')
          if (fix === 'tabindex') el.removeAttribute('tabindex')
          if (fix === 'aria-label') el.removeAttribute('aria-label')
          if (fix === 'lang') el.removeAttribute('lang')
        })
        el.removeAttribute('data-a11y-fixed')
      })
      setFixCount(0)
    }
  }, [enabled])

  return { fixCount }
}

// Image tooltips hook
export function useImageTooltips(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let activeTooltip: HTMLElement | null = null

    function handleMouseEnter(e: Event) {
      const img = e.target as HTMLImageElement
      const alt = img.getAttribute('alt')
      if (!alt) return

      const tooltip = document.createElement('div')
      tooltip.className = 'a11y-image-tooltip'
      tooltip.textContent = alt
      document.body.appendChild(tooltip)

      const rect = img.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()

      // Position below image, or above if it would overflow
      let top = rect.bottom + 4
      if (top + tooltipRect.height > window.innerHeight) {
        top = rect.top - tooltipRect.height - 4
      }

      // Keep within horizontal bounds
      let left = rect.left
      if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8
      }

      tooltip.style.top = `${top}px`
      tooltip.style.left = `${left}px`
      activeTooltip = tooltip
    }

    function handleMouseLeave() {
      if (activeTooltip) {
        activeTooltip.remove()
        activeTooltip = null
      }
    }

    const images = document.querySelectorAll('img[alt]')
    images.forEach((img) => {
      img.addEventListener('mouseenter', handleMouseEnter)
      img.addEventListener('mouseleave', handleMouseLeave)
    })

    return () => {
      images.forEach((img) => {
        img.removeEventListener('mouseenter', handleMouseEnter)
        img.removeEventListener('mouseleave', handleMouseLeave)
      })
      if (activeTooltip) {
        activeTooltip.remove()
        activeTooltip = null
      }
    }
  }, [enabled])
}
