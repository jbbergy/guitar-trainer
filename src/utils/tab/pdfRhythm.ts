import type { PdfPageGeometry, PdfSegment, PdfShape, PdfStaff } from './pdfLayout'

/**
 * Reads note lengths from an engraved page. Two layouts are understood:
 *  - rhythm written on the tab staff itself: a stem under each number, with flags, beams and dots;
 *  - a standard notation staff above the tab staff, drawn with a music font (SMuFL code points).
 * Durations are counted in 32nd notes.
 */

export interface MeasureTiming {
    /** Start of each requested slot, in 32nd notes from the start of the measure */
    onsets: number[]
    /** Length of the measure as written, in 32nd notes */
    total: number
}

const WHOLE = 32
const QUARTER = 8

const NOTEHEAD_WHOLE = 0xe0a2
const NOTEHEAD_HALF = 0xe0a3
const NOTEHEAD_BLACK = 0xe0a4
const AUGMENTATION_DOT = 0xe1e7
/** Rest glyphs: code point → length in 32nd notes. */
const RESTS: Record<number, number> = { 0xe4e3: 32, 0xe4e4: 16, 0xe4e5: 8, 0xe4e6: 4, 0xe4e7: 2, 0xe4e8: 1 }
const TIME_DIGIT_FIRST = 0xe080
const FLAG_FIRST = 0xe240
const FLAG_LAST = 0xe24f
/** Metronome mark glyphs: code point → beat length in quarter notes. */
const METRONOME_BEATS: Record<number, number> = { 0xeca3: 2, 0xeca5: 1, 0xeca7: 0.5 }
const METRONOME_DOT = 0xecb7

const codeOf = (str: string): number => (str.trim().length === 1 ? str.trim().charCodeAt(0) : 0)

interface Stem {
    x: number
    low: number
    high: number
}

interface TimedEvent {
    x: number
    duration: number
    /** Stem direction separates the two voices of a fingerstyle arrangement */
    voice: 'up' | 'down' | null
}

const isVertical = (segment: PdfSegment): boolean => Math.abs(segment.x1 - segment.x2) < 0.3

/** Stems: vertical strokes that are neither bar lines nor edges of small shapes. */
function findStems(page: PdfPageGeometry, minX: number, maxX: number, minY: number, maxY: number): Stem[] {
    return page.segments
        .filter(isVertical)
        .map((segment) => ({ x: segment.x1, low: Math.min(segment.y1, segment.y2), high: Math.max(segment.y1, segment.y2) }))
        .filter((stem) => stem.x > minX && stem.x < maxX && stem.high - stem.low >= 8 && stem.high - stem.low <= 60)
        .filter((stem) => stem.high > minY && stem.low < maxY)
}

/** Beams: straight-edged filled shapes, wider than a note and thicker than a line. */
const isBeam = (shape: PdfShape): boolean =>
    !shape.curved && shape.maxX - shape.minX >= 4.5 && shape.maxY - shape.minY >= 1.5 && shape.maxY - shape.minY <= 14

/** Number of beams reaching the free end of a stem. */
function beamsAt(page: PdfPageGeometry, stem: Stem, tipY: number): number {
    return (page.shapes ?? []).filter(
        (shape) =>
            isBeam(shape) && stem.x >= shape.minX - 0.8 && stem.x <= shape.maxX + 0.8 &&
            tipY >= shape.minY - 9 && tipY <= shape.maxY + 9
    ).length
}

/** Flags: music-font glyphs on the stem, or (when drawn as outlines) a curved shape hanging from it. */
function flagsAt(page: PdfPageGeometry, stem: Stem): number {
    let glyphFlags = 0
    for (const text of page.texts) {
        const code = codeOf(text.str)
        if (code < FLAG_FIRST || code > FLAG_LAST) continue
        if (Math.abs(text.x - stem.x) < 2.5 && text.y > stem.low - 6 && text.y < stem.high + 6) {
            glyphFlags = Math.max(glyphFlags, Math.floor((code - FLAG_FIRST) / 2) + 1)
        }
    }
    if (glyphFlags > 0) return glyphFlags

    const drawn = (page.shapes ?? []).some(
        (shape) =>
            shape.curved && Math.abs(shape.minX - stem.x) < 1.2 && shape.maxX - shape.minX >= 3 && shape.maxX - shape.minX <= 11 &&
            shape.maxY - shape.minY >= 8 &&
            // The flag hangs from the free end of the stem, whichever way the stem points.
            (Math.abs(shape.minY - stem.low) < 3 || Math.abs(shape.maxY - stem.high) < 3)
    )
    return drawn ? 1 : 0
}

const withDot = (duration: number, dotted: boolean): number => (dotted ? duration * 1.5 : duration)

/** Events of a measure whose rhythm is written with stems on the tab staff. */
function tabStemEvents(page: PdfPageGeometry, staff: PdfStaff, slotXs: number[], start: number, end: number): TimedEvent[] {
    const bottom = staff.lines[0]
    const top = staff.lines[staff.lines.length - 1]
    // A stem touches its staff and stands on a number; other strokes (clef, bar lines, brackets) do not.
    const stems = findStems(page, start + 1, end - 0.5, bottom - 12, top + 12)
        .filter((stem) => !(stem.low <= bottom + 1 && stem.high >= top - 1 && stem.low > bottom - 3 && stem.high < top + 3))
        .filter((stem) => slotXs.some((x) => Math.abs(x - stem.x) <= 3))

    return stems.map((stem) => {
        const below = stem.low < bottom - 2
        const tipY = below ? stem.low : stem.high
        const levels = Math.max(beamsAt(page, stem, tipY), flagsAt(page, stem))
        const dotted = (page.dots ?? []).some((dot) => dot.x > stem.x && dot.x - stem.x < 7 && Math.abs(dot.y - tipY) < 5)
        return { x: stem.x, duration: withDot(QUARTER / 2 ** levels, dotted), voice: null }
    })
}

/** Events of a measure read from the notation staff written above the tab staff. */
function notationEvents(page: PdfPageGeometry, notation: PdfStaff, start: number, end: number): TimedEvent[] {
    const bottom = notation.lines[0] - 24
    const top = notation.lines[notation.lines.length - 1] + 24
    const glyphs = page.texts
        .map((text) => ({ code: codeOf(text.str), x: text.x, y: text.y, width: text.width || 6 }))
        .filter((glyph) => glyph.code >= 0xe000 && glyph.x > start && glyph.x < end && glyph.y > bottom && glyph.y < top)
    const stems = findStems(page, start - 2, end + 2, bottom - 20, top + 20)
    const dots = glyphs.filter((glyph) => glyph.code === AUGMENTATION_DOT)
    const isDotted = (x: number, y: number) => dots.some((dot) => dot.x > x && dot.x - x < 16 && Math.abs(dot.y - y) < 5)

    const events: TimedEvent[] = []
    for (const glyph of glyphs) {
        const centre = glyph.x + glyph.width / 2
        if (RESTS[glyph.code]) {
            events.push({ x: centre, duration: withDot(RESTS[glyph.code], isDotted(glyph.x, glyph.y)), voice: null })
            continue
        }
        if (glyph.code !== NOTEHEAD_BLACK && glyph.code !== NOTEHEAD_HALF && glyph.code !== NOTEHEAD_WHOLE) continue

        const dotted = isDotted(glyph.x, glyph.y)
        if (glyph.code === NOTEHEAD_WHOLE) {
            events.push({ x: centre, duration: withDot(WHOLE, dotted), voice: null })
            continue
        }

        // The stem starts at the note head and leaves on its right (up) or its left (down).
        const stem = stems.find(
            (candidate) =>
                candidate.x >= glyph.x - 1.5 && candidate.x <= glyph.x + glyph.width + 1.5 &&
                glyph.y >= candidate.low - 4 && glyph.y <= candidate.high + 4
        )
        if (!stem) {
            events.push({ x: centre, duration: withDot(glyph.code === NOTEHEAD_HALF ? 16 : QUARTER, dotted), voice: null })
            continue
        }
        const up = stem.high - glyph.y > glyph.y - stem.low
        const levels = glyph.code === NOTEHEAD_HALF ? 0 : Math.max(beamsAt(page, stem, up ? stem.high : stem.low), flagsAt(page, stem))
        const base = glyph.code === NOTEHEAD_HALF ? 16 : QUARTER / 2 ** levels
        events.push({ x: centre, duration: withDot(base, dotted), voice: up ? 'up' : 'down' })
    }
    return events
}

/**
 * Timing of the slots of one measure, or null when the rhythm cannot be read
 * (no stems, a slot without a note, a duration that is not a whole number of 32nds).
 */
export function measureTiming(
    page: PdfPageGeometry,
    staff: PdfStaff,
    notation: PdfStaff | null,
    slotXs: number[],
    start: number,
    end: number
): MeasureTiming | null {
    // The notation staff wins when it holds notes; otherwise look for stems on the tab staff itself.
    const written = notation ? notationEvents(page, notation, start, end) : []
    const events = written.length > 0 ? written : tabStemEvents(page, staff, slotXs, start, end)
    if (events.length === 0) return null

    // Events sharing an x start together.
    const columns: { x: number; events: TimedEvent[] }[] = []
    for (const event of [...events].sort((a, b) => a.x - b.x)) {
        const last = columns[columns.length - 1]
        if (last && event.x - last.x < 3.5) last.events.push(event)
        else columns.push({ x: event.x, events: [event] })
    }

    // Each voice keeps its own clock. Rests and stemless notes carry no stem direction:
    // they go with the voice of the next note (else the previous one).
    const usesBothVoices = events.some((event) => event.voice === 'up') && events.some((event) => event.voice === 'down')
    const knownVoice = (index: number): 'up' | 'down' | null => columns[index]?.events.find((event) => event.voice)?.voice ?? null
    const clock = { up: 0, down: 0 }
    const starts: number[] = []
    let previousVoice: 'up' | 'down' = 'up'

    columns.forEach((column, index) => {
        const fallback = knownVoice(index) ?? knownVoice(index + 1) ?? previousVoice
        const voices = column.events.map((event): 'up' | 'down' => (usesBothVoices ? event.voice ?? fallback : 'up'))
        let startTime = Math.max(...voices.map((voice) => clock[voice]))
        // A voice that was silent resumes when the shortest note of the previous column ends.
        if (index > 0 && startTime <= starts[index - 1]) {
            startTime = starts[index - 1] + Math.min(...columns[index - 1].events.map((event) => event.duration))
        }
        starts.push(startTime)
        column.events.forEach((event, eventIndex) => {
            clock[voices[eventIndex]] = Math.max(clock[voices[eventIndex]], startTime + event.duration)
        })
        previousVoice = voices[voices.length - 1]
    })

    const total = Math.max(clock.up, clock.down)
    const onsets = slotXs.map((x) => {
        let best = -1
        columns.forEach((column, index) => {
            if (Math.abs(column.x - x) <= 4.5 && (best < 0 || Math.abs(column.x - x) < Math.abs(columns[best].x - x))) best = index
        })
        return best < 0 ? -1 : starts[best]
    })

    const whole = (value: number) => Number.isInteger(value) && value >= 0
    if (!whole(total) || total === 0 || onsets.some((onset) => !whole(onset))) return null
    if (onsets.some((onset, index) => index > 0 && onset <= onsets[index - 1])) return null
    return { onsets, total }
}

/** Time signature written with music-font digits at the start of a staff, e.g. [6, 8]. */
export function readTimeSignature(page: PdfPageGeometry): [number, number] | null {
    const digits = page.texts
        .map((text) => ({ value: codeOf(text.str) - TIME_DIGIT_FIRST, x: text.x, y: text.y }))
        .filter((digit) => digit.value >= 0 && digit.value <= 9)
        .sort((a, b) => b.y - a.y)
    for (const upper of digits) {
        const lower = digits.find((other) => other !== upper && Math.abs(other.x - upper.x) < 3 && upper.y - other.y > 4 && upper.y - other.y < 30)
        if (lower && upper.value > 0 && [2, 4, 8, 16].includes(lower.value)) return [upper.value, lower.value]
    }
    return null
}

/** Tempo in quarter notes per minute, from a metronome mark such as "♪ = 176". */
export function readTempo(page: PdfPageGeometry): number | null {
    for (const text of page.texts) {
        const match = /^=\s*(\d{2,3})$/.exec(text.str.trim())
        if (!match) continue
        const nearby = page.texts.filter((other) => Math.abs(other.y - text.y) < 8 && text.x - other.x > 0 && text.x - other.x < 30)
        const note = nearby.find((other) => METRONOME_BEATS[codeOf(other.str)])
        const beat = note ? METRONOME_BEATS[codeOf(note.str)] : 1
        const dotted = nearby.some((other) => codeOf(other.str) === METRONOME_DOT || codeOf(other.str) === AUGMENTATION_DOT)
        return Math.round(Number(match[1]) * beat * (dotted ? 1.5 : 1))
    }
    return null
}
