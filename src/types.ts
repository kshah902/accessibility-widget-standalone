export type TextSize = '100' | '125' | '150' | '175'

export type ColorBlindnessMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'

export type FocusThickness = '2px' | '4px' | '6px'
export type FocusStyle = 'solid' | 'dashed' | 'dotted'

export type TextSpacing = 'normal' | 'wide' | 'wider'
export type SaturationLevel = 'low' | 'normal' | 'high'
export type TextAlignment = 'default' | 'left' | 'center' | 'right'
export type WidgetLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi' | 'bn' | 'ru'

export interface FocusIndicatorSettings {
  enabled: boolean
  thickness: FocusThickness
  color: string
  style: FocusStyle
}

export interface AccessibilitySettings {
  // Original settings
  textSize: TextSize
  highContrast: boolean
  reduceMotion: boolean
  highlightLinks: boolean
  lineHeight: boolean
  dyslexiaFont: boolean
  bigCursor: boolean
  readingGuide: boolean
  colorBlindnessMode: ColorBlindnessMode
  focusIndicator: FocusIndicatorSettings
  ttsEnabled: boolean
  ttsRate: number // 0.5 to 2.0

  // v1.2.0 — Display & Visual Enhancements
  darkMode: boolean
  textSpacing: TextSpacing
  monochrome: boolean
  saturationLevel: SaturationLevel
  hideImages: boolean

  // v1.3.0 — Reading & Navigation Enhancements
  readingMask: boolean
  textAlignment: TextAlignment
  highlightHover: boolean
  imageTooltips: boolean

  // v1.4.0 — Profiles & Presets
  muteSounds: boolean
  language: WidgetLanguage

  // v1.5.0 — Full Feature Parity
  readableFont: boolean
  customTextColor: string
  customTitleColor: string
  customBgColor: string
  dictionaryEnabled: boolean
  virtualKeyboard: boolean
  voiceCommands: boolean
  altTextDetection: boolean
  autoRemediation: boolean
}

// For backwards compatibility - settings that are just booleans
export type BooleanSettingKey =
  | 'highContrast'
  | 'reduceMotion'
  | 'highlightLinks'
  | 'lineHeight'
  | 'dyslexiaFont'
  | 'bigCursor'
  | 'readingGuide'
  | 'ttsEnabled'
  | 'darkMode'
  | 'monochrome'
  | 'hideImages'
  | 'readingMask'
  | 'highlightHover'
  | 'imageTooltips'
  | 'muteSounds'
  | 'readableFont'
  | 'dictionaryEnabled'
  | 'virtualKeyboard'
  | 'voiceCommands'
  | 'altTextDetection'
  | 'autoRemediation'
