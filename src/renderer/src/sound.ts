import chimeUrl from './assets/chime.wav'

/**
 * Short chime played when a step ends (work->rest, rest->work, or session
 * complete) — an audible cue to go with the takeover window, since the app
 * isn't always the focused/visible window when a step finishes.
 */
export function playChime(): void {
  const audio = new Audio(chimeUrl)
  audio.volume = 0.6
  void audio.play().catch(() => {
    // Autoplay can be blocked before the user has interacted with the page at
    // all; harmless to skip the cue in that edge case.
  })
}
