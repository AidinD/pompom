import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

/*
 * PomPom's app icon, drawn without dependencies.
 *
 * The mark is the one in the header (`src/renderer/src/PomPomMark.tsx`): a
 * filled tomato - body, stalk, and a leaf either side of it. The geometry below
 * is that component's, scaled off its 100-unit viewBox, so the mark beside the
 * wordmark and the mark in the taskbar are the same drawing. Change one, change
 * the other.
 *
 * One drawing at every size - no simplified twin for the small frames. The
 * body is filled, so the mark survives 16px as it is, and a second drawing
 * would be a second mark nobody approved.
 *
 * It goes into a multi-size icon.ico so Windows renders each frame at its own
 * size rather than downscaling the 256.
 *
 * The PNG and ICO writers are Nib's and Jot's, kept byte-compatible on purpose -
 * four apps, one icon pipeline.
 *
 * Run with `node scripts/generate-icon.mjs`. The output is committed, because
 * packaging must not depend on having run a script first.
 */

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'resources')
mkdirSync(outDir, { recursive: true })

// ---------- PNG ----------

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function renderPng(size, shade) {
  const rows = []
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4)
    for (let x = 0; x < size; x += 1) {
      row.set(shade(x + 0.5, y + 0.5, size), 1 + x * 4)
    }
    rows.push(row)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- ICO ----------

/**
 * A Vista-era .ico: a directory of entries, each holding a whole PNG.
 *
 * Written by hand so the small sizes can be a different drawing. Handing
 * electron-builder a single large PNG would have it downscale that one drawing
 * to 16px, which is exactly what the second drawing exists to avoid.
 */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  const directory = []
  let offset = 6 + images.length * 16
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16)
    entry[0] = size >= 256 ? 0 : size // 0 means 256
    entry[1] = size >= 256 ? 0 : size
    entry[2] = 0 // palette
    entry[3] = 0 // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    directory.push(entry)
    offset += png.length
  }

  return Buffer.concat([header, ...directory, ...images.map((image) => image.png)])
}

// ---------- distance fields ----------

/*
 * Every primitive returns a SIGNED distance - negative inside the shape - so a
 * filled body and a stroked stalk can be unioned with a plain Math.min and
 * shaded by one coverage rule.
 */

const mix = (a, b, t) => a + (b - a) * t
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

/**
 * Signed distance to a filled ellipse.
 *
 * The exact distance to an ellipse needs an iterative solve; this is the usual
 * cheap approximation - measure in a space where the ellipse is a unit circle,
 * then scale back by the smaller radius. At rx/ry = 30/27 the error is well
 * inside the one pixel of feathering below.
 */
function sdEllipse(px, py, cx, cy, rx, ry) {
  const k = Math.hypot((px - cx) / rx, (py - cy) / ry)
  return (k - 1) * Math.min(rx, ry)
}

/**
 * Signed distance to a round cone: a segment whose radius runs from `ra` at A
 * to `rb` at B. That is what draws the leaves - thick where they meet the
 * stalk, pointed at the tip - and, with ra === rb, the stalk itself.
 */
function sdCone(px, py, ax, ay, bx, by, ra, rb) {
  const abx = bx - ax
  const aby = by - ay
  const lengthSquared = abx * abx + aby * aby
  const t = lengthSquared === 0 ? 0 : clamp(((px - ax) * abx + (py - ay) * aby) / lengthSquared, 0, 1)
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t)) - mix(ra, rb, t)
}

/**
 * Flatten a run of cubic bezier segments into a polygon.
 *
 * The calyx in PomPomMark.tsx is a bezier path, and the point of this generator
 * is that the icon is the SAME drawing as the header mark - so the path is
 * rasterised rather than approximated with strokes. An earlier version stood in
 * two tapered cones per lobe for it and shipped a visibly different tomato:
 * thin splayed spikes instead of two solid lobes.
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

/** Anti-aliasing: coverage falls off across about a pixel of distance. */
function coverage(signedDistance, feather = 1.1) {
  return clamp(-signedDistance / feather + 0.5, 0, 1)
}

/**
 * The tomato ramp from PomPomMark's gradient.
 *
 * Per SHAPE, not across the canvas: the component paints each path with an
 * objectBoundingBox gradient, so the body runs the full ramp over the body's
 * box and the calyx runs it again over its own. One ramp across the whole
 * canvas is a different colouring, and next to the header mark it reads redder.
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

// ---------- the two drawings ----------

/*
 * ONE drawing, at every size: PomPomMark.tsx's geometry over its 100-unit
 * viewBox. The body ellipse at (50,66) with radii 30 and 27, and the calyx
 * rasterised from the same cubics the component draws.
 *
 * Jot and Nib carry a second, simplified drawing for the sizes below 32, where
 * their stroked marks thin under a pixel. PomPom does not need one and does not
 * get one: its body is filled, so it survives the small frames as it is - and a
 * second drawing means a second mark to approve, which is not what an app icon
 * is for.
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

  const alpha = coverage(Math.min(body, calyx) * unit)
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
 * It carries 20 and 24 as well as the usual ladder, because Windows asks for
 * those at 125% and 150% display scaling - the two scales where a missing frame
 * means it resamples a neighbour and the mark goes soft again.
 */
writeFileSync(
  join(outDir, 'icon.ico'),
  buildIco(
    [256, 128, 64, 48, 32, 24, 20, 16].map((size) => ({ size, png: renderPng(size, shadeMark) }))
  )
)

console.log('Wrote resources/icon.png and resources/icon.ico')
