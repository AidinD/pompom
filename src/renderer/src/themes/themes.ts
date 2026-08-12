/**
 * PomPom theme system.
 *
 * Three swappable palettes (see themes.css). A theme is applied to the app
 * root element together with a work/rest state class; both classes live on the
 * SAME element so the compound selectors in themes.css (e.g. `.theme-neon.state-work`)
 * match and the accent hue shifts correctly.
 */

export type ThemeId = 'neon' | 'paper' | 'nature' | 'zen'
export type SessionState = 'work' | 'rest'

export interface ThemeDef {
  id: ThemeId
  /** Human-readable name shown in the theme picker. */
  name: string
  /** CSS class applied to the app root for this theme. */
  className: string
  /** Work accent color — used for the picker swatch. */
  swatchWork: string
  /** Rest accent color — used for the picker swatch. */
  swatchRest: string
}

export const THEMES: ThemeDef[] = [
  {
    id: 'neon',
    name: 'Neon Dark',
    className: 'theme-neon',
    swatchWork: '#3ddc97',
    swatchRest: '#ffab4d'
  },
  {
    id: 'paper',
    name: 'Warm Paper',
    className: 'theme-paper',
    swatchWork: '#d99567',
    swatchRest: '#9db179'
  },
  {
    id: 'nature',
    name: 'Nature',
    className: 'theme-nature',
    swatchWork: '#86a563',
    swatchRest: '#c6883f'
  },
  {
    id: 'zen',
    name: 'Zen',
    className: 'theme-zen',
    swatchWork: '#7ea393',
    swatchRest: '#b79a7c'
  }
]

export const DEFAULT_THEME: ThemeId = 'neon'

const THEME_CLASSES = THEMES.map((t) => t.className)
const STATE_CLASSES = ['state-work', 'state-rest']

export function getTheme(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

/**
 * Apply a theme (and optional work/rest state) to a root element. Idempotent:
 * removes any previously applied theme/state classes first so it can be called
 * on every render or state change without accumulating classes.
 */
export function applyTheme(root: HTMLElement, id: ThemeId, state: SessionState = 'work'): void {
  root.classList.remove(...THEME_CLASSES, ...STATE_CLASSES)
  root.classList.add(getTheme(id).className, state === 'rest' ? 'state-rest' : 'state-work')
}
