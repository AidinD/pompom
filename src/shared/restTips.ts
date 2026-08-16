/**
 * Short suggestions shown during a rest step — a nudge for what to actually do
 * with the break, since "stare at the timer" defeats the point of resting.
 */
export const REST_TIPS: string[] = [
  'Grab some water.',
  'Stand up and stretch.',
  'Look at something 6+ meters away for 20 seconds.',
  'Take a few slow breaths.',
  'Walk to another room and back.',
  'Roll your shoulders and neck.',
  'Step outside, even just for a minute.',
  'Refill your coffee or tea.',
  'Close your eyes and just sit for a moment.',
  'Tidy one small thing on your desk.'
]

/** Random pick — callers memoize this once per rest step so it stays stable. */
export function pickRestTip(): string {
  return REST_TIPS[Math.floor(Math.random() * REST_TIPS.length)]
}
