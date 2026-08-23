/**
 * PomPom's mark, in the header beside the wordmark.
 *
 * Drawn inline rather than scaled down from `resources/icon.png`: it sits at
 * 20px next to 20px text, where a downscaled bitmap is soft exactly where the
 * eye is most critical.
 *
 * It belongs to the same family as Jot's circle-and-tick and Nib's pen nib: one
 * object on a transparent background, a warm gradient, no container square.
 *
 * Two things were settled by drawing the alternatives and looking at them at
 * the sizes this actually renders at, 20px and 16px:
 *
 *  - The body is FILLED, not stroked. As an outline it is a ring, and at 20px
 *    the sepals collapse into two hooks either side of it - a horned circle,
 *    and one that reads too close to Jot's ring.
 *  - The calyx is one solid two-lobed shape with the stalk rising clear above
 *    it. Drawn as separate leaf strokes it merges into a single bar across the
 *    top - a lid, or a bowtie - and the stalk disappears behind it.
 */
export function PomPomMark({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="url(#pompom-tomato)"
      strokeWidth={10}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pompom-tomato" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a4a" />
          <stop offset="1" stopColor="#ff5545" />
        </linearGradient>
      </defs>
      {/* Body and calyx, both filled - there is no stalk. An earlier revision
          had one, `M50 36 V12`, and it never drew a pixel: a vertical line has
          a zero-width bounding box, and an objectBoundingBox gradient over a
          degenerate box means the element is not rendered at all. It is gone
          rather than left in, because dead geometry here is geometry the app
          icon would faithfully reproduce and the header would not. */}
      <ellipse cx="50" cy="66" rx="30" ry="27" fill="url(#pompom-tomato)" stroke="none" />
      <path
        d="M50 36 C39 36 31 31 26 23 C37 20 46 24 50 31 C54 24 63 20 74 23 C69 31 61 36 50 36 Z"
        fill="url(#pompom-tomato)"
        stroke="none"
      />
    </svg>
  )
}
