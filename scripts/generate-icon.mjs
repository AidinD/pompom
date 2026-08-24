import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { renderPng, renderIco, coverage, mix } from 'keel/icon'

/*
 * PomPom's app icon.
 *
 * The mark is the one in the header (`src/renderer/src/PomPomMark.tsx`): a
 * filled tomato - body, stalk, and a leaf either side of it. The geometry below
 * is that component's, scaled off its 100-unit viewBox, so the mark beside the
 * wordmark and the mark in the taskbar are the same drawing. Change one, change
 * the other.
 *
 * One drawing at every size - no simplified twin for the small frames. The
 * body is filled, so the mark survives 16px as it is, and a second drawing
 * would be a second mark nobody approved. (keel supplies `SMALL_BELOW` for the
 * apps that do want one; PomPom deliberately does not.)
 *
 * It goes into a multi-size icon.ico so Windows renders each frame at its own
 * size rather than downscaling the 256.
 *
 * The PNG writer, the ICO writer and the colour helper come from `keel/icon`,
 * shared with the rest of the suite. The shapes stay here, because they are the
 * ones keel does not have: an ellipse, and a SIGNED polygon. keel's `distPolygon`
 * is unsigned and has no inside test, and PomPom's body has to know inside from
 * outside to be filled at all.
 *
 * Run with `node scripts/generate-icon.mjs`. The output is committed, because
 * packaging must not depend on having run a script first.
 */

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'resources')
mkdirSync(outDir, { recursive: true })

// ---------- signed distances ----------

/*
 * Both primitives return a SIGNED distance - negative inside the shape - so the
 * body and the calyx can be unioned with a plain Math.min and shaded by one
 * coverage rule. keel's `coverage` subtracts a half-weight, which is zero here
 * because the sign is already in the distance.
 */

const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

/**
 * Signed distance to a filled ellipse.
 *
 * The exact distance to an ellipse needs an iterative solve; this is the usual
 * cheap approximation - measure in a space where the ellipse is a unit circle,
 * then scale back by the smaller radius. At rx/ry = 30/27 the error is well
 * inside the one pixel of feathering.
 */
function sdEllipse(px, py, cx, cy, rx, ry) {
  const k = Math.hypot((px - cx) / rx, (py - cy) / ry)
  return (k - 1) * Math.min(rx, ry)
}

/**
 * Flatten a run of cubic bezier segments into a polygon.
 *
 * The calyx in PomPomMark.tsx is a bezier path, and the point of this generator
 * is that the icon is the SAME drawing as the header mark - so the path is
 * rasterised rather than approximated with strokes. An earlier version stood in
 * two tapered cones per lobe for it and shipped a visibly different tomato:
 * thin splayed spikes instead of two solid lobes.
 *
 * Not keel's `flattenBezier`, which flattens ONE cubic and includes both
 * endpoints. Chaining it over a run would repeat every joint, and a polygon with
 * doubled vertices is a polygon with zero-length edges.
 */
function flattenCubics(start, segments, steps = 24) {
  const points = [start]
  let [x0, y0] = start
  for (const [c1x, c1y, c2x, c2y, x1, y1] of segments) {
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps
      const u = 1 - t
      points.push([
        u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1,
        u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1
      ])
    }
    x0 = x1
    y0 = y1
  }
  return points
}

/**
 * Signed distance to a closed polygon - negative inside.
 *
 * Distance is to the nearest edge; the sign comes from a crossing count, which
 * is why the winding test below flips `inside` rather than accumulating.
 */
function sdPolygon(px, py, polygon) {
  let best = Infinity
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [ix, iy] = polygon[i]
    const [jx, jy] = polygon[j]
    const ex = jx - ix
    const ey = jy - iy
    const wx = px - ix
    const wy = py - iy
    // The closing edge is zero-length when the path ends where it started,
    // which divides by zero and turns the whole distance into NaN.
    const lengthSquared = ex * ex + ey * ey
    if (lengthSquared > 0) {
      const t = clamp((wx * ex + wy * ey) / lengthSquared, 0, 1)
      best = Math.min(best, Math.hypot(wx - ex * t, wy - ey * t))
    }
    if (iy > py !== jy > py && px < ix + ((py - iy) / (jy - iy)) * ex) {
      inside = !inside
    }
  }
  return inside ? -best : best
}

/**
 * The tomato ramp from PomPomMark's gradient.
 *
 * Per SHAPE, not across the canvas - which is why keel's `diagonalRamp` is not
 * used here. The component paints each path with an objectBoundingBox gradient,
 * so the body runs the full ramp over the body's box and the calyx runs it again
 * over its own. One ramp across the whole canvas is a different colouring, and
 * next to the header mark it reads redder.
 */
function tomato(px, py, box) {
  const t = clamp(((px - box[0]) / (box[2] - box[0])) * 0.5 + ((py - box[1]) / (box[3] - box[1])) * 0.5, 0, 1)
  return [255, Math.round(mix(154, 85, t)), Math.round(mix(74, 69, t))]
}

/** Geometry bounding box of a polygon, which is what the gradient measures against. */
function boundsOf(polygon) {
  const xs = polygon.map((point) => point[0])
  const ys = polygon.map((point) => point[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

// ---------- the drawing ----------

/*
 * PomPomMark.tsx's geometry over its 100-unit viewBox: the body ellipse at
 * (50,66) with radii 30 and 27, and the calyx rasterised from the same cubics
 * the component draws.
 */
const CALYX_START = [50, 36]
const CALYX_CUBICS = [
  [39, 36, 31, 31, 26, 23],
  [37, 20, 46, 24, 50, 31],
  [54, 24, 63, 20, 74, 23],
  [69, 31, 61, 36, 50, 36]
]

/** The calyx polygon in 100-unit space, flattened once and scaled per frame. */
const CALYX = flattenCubics(CALYX_START, CALYX_CUBICS)

const BODY_BOX = [20, 39, 80, 93]
const CALYX_BOX = boundsOf(CALYX)

/** A filled tomato: the body, and the two-lobed calyx over its shoulder. */
function shadeMark(x, y, size) {
  const unit = size / 100
  // Work in the 100-unit space the mark is drawn in, then scale the distance
  // back to pixels - one conversion instead of one per primitive.
  const ux = x / unit
  const uy = y / unit

  // Body and calyx only. PomPomMark.tsx also carries a stalk path, but it does
  // not render and never has: its stroke paint is an objectBoundingBox
  // gradient, and a vertical line has a zero-width bounding box, which SVG says
  // makes the element not render at all. The mark IS body plus calyx, so that
  // is what the icon draws - an icon with a stalk would be a different drawing
  // from the one in the header.
  const body = sdEllipse(ux, uy, 50, 66, 30, 27)
  const calyx = sdPolygon(ux, uy, CALYX)

  // Already signed, so the weight keel would subtract is zero.
  const alpha = coverage(Math.min(body, calyx) * unit, 0)
  if (alpha === 0) {
    return [0, 0, 0, 0]
  }
  // The calyx is painted after the body, so it wins where they overlap.
  const [red, green, blue] = calyx < 0 ? tomato(ux, uy, CALYX_BOX) : tomato(ux, uy, BODY_BOX)
  return [red, green, blue, Math.round(255 * alpha)]
}

// ---------- output ----------

// The PNG electron-builder falls back to (and what non-Windows targets use).
writeFileSync(join(outDir, 'icon.png'), renderPng(512, shadeMark))

/*
 * The one .ico, used for the packaged app and for the window icon in dev.
 *
 * keel's DEFAULT_LADDER carries 20 and 24 as well as the usual sizes, because
 * Windows asks for those at 125% and 150% display scaling - the two scales where
 * a missing frame means it resamples a neighbour and the mark goes soft again.
 */
writeFileSync(join(outDir, 'icon.ico'), renderIco(shadeMark))

console.log('Wrote resources/icon.png and resources/icon.ico')
