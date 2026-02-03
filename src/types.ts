export type TextSize = '100' | '125' | '150' | '175'

export type ColorBlindnessMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'

export type FocusThickness = '2px' | '4px' | '6px'
export type FocusStyle = 'solid' | 'dashed' | 'dotted'

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
  // New settings
  colorBlindnessMode: ColorBlindnessMode
  focusIndicator: FocusIndicatorSettings
  ttsEnabled: boolean
  ttsRate: number // 0.5 to 2.0
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
