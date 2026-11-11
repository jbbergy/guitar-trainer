import { MAX_TAB_COLUMNS_PER_MEASURE, MAX_TAB_FRET, type Quantization, type TabMeasure } from '@/types/tablature'
import { measureTiming, readTempo, readTimeSignature, type MeasureTiming } from './pdfRhythm'

/**
 * Geometry of one PDF page, in PDF points with the origin at the bottom-left corner.
 * Only what is needed to read an engraved tablature: text runs and straight strokes.
 */
export interface PdfText {
    str: string
    /** Left edge and baseline of the run */
    x: number
    y: number
    width: number
    height: number
}

export interface PdfSegment {
    x1: number
    y1: number
    x2: number
    y2: number
}

/** Centre of a small filled circle (repeat dots, augmentation dots…). */
export interface PdfDot {
    x: number
    y: number
}

/** Bounding box of a closed drawn shape (beam, flag, note head…). */
export interface PdfShape {
    minX: number
    maxX: number
    minY: number
    maxY: number
    /** True when the outline contains curves */
    curved: boolean
}

export interface PdfPageGeometry {
    width: number
    height: number
    texts: PdfText[]
    segments: PdfSegment[]
    dots?: PdfDot[]
    shapes?: PdfShape[]
}

export interface PdfStaff {
    /** y of each line, lowest line (lowest tab string) first */
    lines: number[]
    left: number
    right: number
}

export interface PdfLayoutResult {
    stringCount: number
    measures: TabMeasure[]
    /** Tab staves found on the page, top to bottom */
    staves: number
}

export interface PlacedDigit {
    fret: number
    string: number
    /** Horizontal centre of the number */
    x: number
}

/** Music-font (SMuFL) characters for repeat bar lines: start, end, end + start. */
const REPEAT_GLYPHS: Record<string, 'start' | 'end' | 'both'> = { '\ue040': 'start', '\ue041': 'end', '\ue042': 'both' }
/** How far from a bar line repeat dots and first / second ending numbers may sit. */
const REPEAT_REACH = 13

const LINE_BUCKET = 0.5
const MIN_LINE_COVERAGE = 0.4
const MAX_LINE_GAP = 14
const MAX_STEPS_PER_GAP = 4

const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/** Groups of 3 to 8 evenly spaced long horizontal lines. */
export function findStaves(page: PdfPageGeometry): PdfStaff[] {
    const buckets = new Map<number, { length: number; left: number; right: number }>()
    for (const segment of page.segments) {
        if (Math.abs(segment.y1 - segment.y2) > 0.3) continue
        const length = Math.abs(segment.x2 - segment.x1)
        if (length < 2) continue
        const y = Math.round(segment.y1 / LINE_BUCKET) * LINE_BUCKET
        // Page borders and frames are not staff lines.
        if (y < 3 || y > page.height - 3) continue
        const bucket = buckets.get(y) ?? { length: 0, left: Infinity, right: -Infinity }
        bucket.length += length
        bucket.left = Math.min(bucket.left, segment.x1, segment.x2)
        bucket.right = Math.max(bucket.right, segment.x1, segment.x2)
        buckets.set(y, bucket)
    }

    const lines = [...buckets.entries()]
        .filter(([, bucket]) => bucket.length >= page.width * MIN_LINE_COVERAGE)
        .map(([y, bucket]) => ({ y, ...bucket }))
        .sort((a, b) => a.y - b.y)

    // Thick lines are drawn as two edges: keep one of them.
    const distinct = lines.filter((line, index) => index === 0 || line.y - lines[index - 1].y > 1.2)

    const staves: PdfStaff[] = []
    let group: typeof distinct = []
    const flush = () => {
        if (group.length >= 3 && group.length <= 8) {
            staves.push({
                lines: group.map((line) => line.y),
                left: Math.min(...group.map((line) => line.left)),
                right: Math.max(...group.map((line) => line.right)),
            })
        }
        group = []
    }

    for (const line of distinct) {
        if (group.length === 0) {
            group.push(line)
            continue
        }
        const gap = line.y - group[group.length - 1].y
        const spacing = group.length > 1 ? group[1].y - group[0].y : gap
        if (gap <= MAX_LINE_GAP && Math.abs(gap - spacing) <= Math.max(0.6, spacing * 0.15)) {
            group.push(line)
        } else {
            flush()
            group.push(line)
        }
    }
    flush()

    return staves.sort((a, b) => b.lines[0] - a.lines[0])
}

/** Fret numbers sitting on the lines of a staff. */
function digitsOnStaff(page: PdfPageGeometry, staff: PdfStaff): PlacedDigit[] {
    const spacing = (staff.lines[staff.lines.length - 1] - staff.lines[0]) / (staff.lines.length - 1)
    const candidates: (PlacedDigit & { left: number; right: number; height: number })[] = []

    for (const text of page.texts) {
        const str = text.str.trim()
        if (!/^\d{1,2}$/.test(str) || Number(str) > MAX_TAB_FRET) continue
        // A number is vertically centred on its line: about a third of its height above the baseline.
        const centre = text.y + text.height * 0.35
        const position = (centre - staff.lines[0]) / spacing
        const string = Math.round(position)
        if (string < 0 || string >= staff.lines.length || Math.abs(position - string) > 0.38) continue
        if (text.x < staff.left - 2 || text.x > staff.right + 2) continue
        candidates.push({
            fret: Number(str), string, x: text.x + text.width / 2,
            left: text.x, right: text.x + text.width, height: text.height,
        })
    }

    // Small numbers (grace notes, fingerings) are left out.
    const usual = median(candidates.map((digit) => digit.height))
    const kept = candidates.filter((digit) => digit.height >= usual * 0.85).sort((a, b) => a.string - b.string || a.left - b.left)

    // "1" and "2" written as two runs side by side make fret 12.
    const merged: typeof kept = []
    for (const digit of kept) {
        const previous = merged[merged.length - 1]
        const adjacent =
            previous && previous.string === digit.string && digit.left - previous.right < digit.height * 0.25 &&
            previous.fret < 10 && digit.fret < 10 && previous.fret * 10 + digit.fret <= MAX_TAB_FRET && previous.fret > 0
        if (adjacent) {
            previous.fret = previous.fret * 10 + digit.fret
            previous.right = digit.right
            previous.x = (previous.left + previous.right) / 2
        } else {
            merged.push({ ...digit })
        }
    }
    return merged
}

/** x of the bar lines crossing the whole staff, plus the staff edges. */
function barPositions(page: PdfPageGeometry, staff: PdfStaff): number[] {
    const bottom = staff.lines[0]
    const top = staff.lines[staff.lines.length - 1]
    const tolerance = (top - bottom) * 0.08
    const xs = page.segments
        .filter((segment) => Math.abs(segment.x1 - segment.x2) < 0.5)
        .filter((segment) => Math.min(segment.y1, segment.y2) <= bottom + tolerance && Math.max(segment.y1, segment.y2) >= top - tolerance)
        .map((segment) => segment.x1)
        .filter((x) => x >= staff.left - 2 && x <= staff.right + 2)
        .sort((a, b) => a - b)

    const bars: number[] = [staff.left]
    for (const x of [...xs, staff.right]) {
        // Double bars and repeat signs count once.
        if (x - bars[bars.length - 1] > 8) bars.push(x)
        else if (bars.length > 1) bars[bars.length - 1] = x
    }
    return bars
}

interface RepeatSigns {
    /** x of dot pairs written just after a bar line (repeat start) or just before one (repeat end) */
    dotColumns: number[]
    glyphs: { x: number; kind: 'start' | 'end' | 'both' }[]
    /** "1." / "2." written above the staff */
    endings: { x: number; number: number }[]
}

/** Repeat dots, repeat glyphs and ending numbers belonging to a staff. */
function repeatSigns(page: PdfPageGeometry, staff: PdfStaff): RepeatSigns {
    const bottom = staff.lines[0]
    const top = staff.lines[staff.lines.length - 1]

    // Repeat dots come in pairs stacked inside the staff.
    const inside = (page.dots ?? []).filter((dot) => dot.y > bottom && dot.y < top && dot.x >= staff.left - 2 && dot.x <= staff.right + 2)
    const dotColumns: number[] = []
    for (const dot of inside) {
        const stacked = inside.filter((other) => Math.abs(other.x - dot.x) < 1.5).length
        if (stacked >= 2 && !dotColumns.some((x) => Math.abs(x - dot.x) < 1.5)) dotColumns.push(dot.x)
    }

    const glyphs = page.texts
        .filter((text) => REPEAT_GLYPHS[text.str.trim()] && text.y >= bottom - 4 && text.y <= top + 4)
        .map((text) => ({ x: text.x, kind: REPEAT_GLYPHS[text.str.trim()] }))

    const endings = page.texts
        .filter((text) => /^[1-9]\.$/.test(text.str.trim()) && text.y > top && text.y < top + 28)
        .map((text) => ({ x: text.x, number: Number(text.str.trim()[0]) }))

    return { dotColumns, glyphs, endings }
}

/** One measure as found on the page, before note lengths are turned into grid columns. */
export interface PdfRawMeasure {
    slots: { x: number; digits: PlacedDigit[] }[]
    start: number
    end: number
    /** Note lengths read from stems or from the notation staff, null when they could not be read */
    timing: MeasureTiming | null
    marks: Pick<TabMeasure, 'repeatStart' | 'repeatEnd' | 'ending'>
}

export interface PdfPageReading {
    stringCount: number
    staves: number
    measures: PdfRawMeasure[]
    timeSignature: [number, number] | null
    /** Tempo in quarter notes per minute */
    bpm: number | null
}

/** Finds the tab staves of a page and what is written on them. */
export function readPdfPage(page: PdfPageGeometry, expectedStrings?: number): PdfPageReading | null {
    const allStaves = findStaves(page)
    const candidates = allStaves
        .map((staff) => ({ staff, digits: digitsOnStaff(page, staff) }))
        .filter((entry) => entry.digits.length > 0)
    if (candidates.length === 0) return null

    // Notation staves have 5 lines and no numbers; keep the string count used most.
    const counts = candidates.map((entry) => entry.staff.lines.length)
    const frequency = (count: number) => counts.filter((other) => other === count).length
    const stringCount = expectedStrings ?? [...counts].sort((a, b) => frequency(b) - frequency(a))[0]
    const staves = candidates.filter((entry) => entry.staff.lines.length === stringCount)
    if (staves.length === 0) return null
    const tabStaves = new Set(staves.map((entry) => entry.staff))

    const measures: PdfRawMeasure[] = []
    for (const { staff, digits } of staves) {
        // Slots: numbers sharing (almost) the same x are played together.
        const slots: PdfRawMeasure['slots'] = []
        for (const digit of [...digits].sort((a, b) => a.x - b.x)) {
            const last = slots[slots.length - 1]
            if (last && digit.x - last.x < 3.5 && !last.digits.some((other) => other.string === digit.string)) last.digits.push(digit)
            else slots.push({ x: digit.x, digits: [digit] })
        }

        // A 5-line staff right above the tab staff carries the rhythm in standard notation.
        const top = staff.lines[staff.lines.length - 1]
        const notation = allStaves
            .filter((other) => !tabStaves.has(other) && other.lines.length === 5 && other.lines[0] > top && other.lines[0] - top < 90)
            .sort((a, b) => a.lines[0] - b.lines[0])[0] ?? null

        const bars = barPositions(page, staff)
        const { dotColumns, glyphs, endings } = repeatSigns(page, staff)
        for (let b = 0; b < bars.length - 1; b++) {
            const [start, end] = [bars[b], bars[b + 1]]
            const inside = slots.filter((slot) => slot.x >= start && slot.x < end)
            // A gap without notes at the staff edge is the clef area, not a measure of rest.
            if (inside.length === 0 && (b === 0 || end - start < 12)) continue

            const marks: PdfRawMeasure['marks'] = {}
            if (
                dotColumns.some((x) => x > start && x <= start + REPEAT_REACH && x - start < end - x) ||
                glyphs.some((glyph) => glyph.kind !== 'end' && Math.abs(glyph.x - start) <= REPEAT_REACH)
            ) marks.repeatStart = true
            if (
                dotColumns.some((x) => x < end && x >= end - REPEAT_REACH && end - x < x - start) ||
                glyphs.some((glyph) => glyph.kind !== 'start' && Math.abs(glyph.x - end) <= REPEAT_REACH)
            ) marks.repeatEnd = 2
            const ending = endings.find((entry) => entry.x >= start - 4 && entry.x < end - 4)?.number
            if (ending) marks.ending = ending

            measures.push({
                slots: inside,
                start,
                end,
                marks,
                timing: inside.length > 0 ? measureTiming(page, staff, notation, inside.map((slot) => slot.x), start, end) : null,
            })
        }
    }

    // A first-ending bracket runs up to the repeat sign that closes it.
    measures.forEach((measure, index) => {
        if (measure.marks.ending !== 1 || measure.marks.repeatEnd) return
        for (let next = index + 1; next < Math.min(measures.length, index + 4); next++) {
            if (measures[next].marks.ending) return
            if (measures[next].marks.repeatEnd) {
                for (let fill = index + 1; fill <= next; fill++) measures[fill].marks.ending = 1
                return
            }
        }
    })

    if (measures.length === 0) return null
    return { stringCount, staves: staves.length, measures, timeSignature: readTimeSignature(page), bpm: readTempo(page) }
}

export interface PdfBuildResult {
    measures: TabMeasure[]
    quantization: Quantization
    /** Time signature read on the page or deduced from the note lengths */
    timeSignature: [number, number] | null
    /** Measures whose rhythm was read, out of `measures.length` */
    readMeasures: number
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

const mostCommon = (values: number[]): number | null => {
    const counts = new Map<number, number>()
    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/** Shares `total` steps between gaps in proportion to their width (every gap gets at least one step). */
function shareSteps(gaps: number[], total: number): number[] | null {
    if (gaps.length === 0 || gaps.length > total) return null
    // Engravers give long notes less than their share of the space: stretch the differences back.
    const weights = gaps.map((gap) => Math.max(1, gap) ** 1.6)
    const sum = weights.reduce((a, b) => a + b, 0)
    const ideal = weights.map((weight) => (weight / sum) * total)
    const steps = ideal.map((value) => Math.max(1, Math.floor(value)))
    while (steps.reduce((a, b) => a + b, 0) < total) {
        let best = 0
        ideal.forEach((value, index) => {
            if (value - steps[index] > ideal[best] - steps[best]) best = index
        })
        steps[best]++
    }
    while (steps.reduce((a, b) => a + b, 0) > total) {
        let best = -1
        steps.forEach((value, index) => {
            if (value > 1 && (best < 0 || value - ideal[index] > steps[best] - ideal[best])) best = index
        })
        if (best < 0) return null
        steps[best]--
    }
    return steps
}

/**
 * Turns the measures read on the pages into grid measures. Note lengths come, in order
 * of preference, from the written rhythm, from the measure length shared out along the
 * spacing of the numbers, and from the spacing alone.
 */
export function buildPdfMeasures(raw: PdfRawMeasure[], stringCount: number, signature: [number, number] | null = null): PdfBuildResult {
    const timed = raw.filter((measure) => measure.timing !== null).map((measure) => measure.timing as MeasureTiming)
    const expected = signature ? (signature[0] * 32) / signature[1] : mostCommon(timed.map((timing) => timing.total))

    // Grid step in 32nd notes: the largest power of two dividing every position that was read.
    let step = 4
    if (timed.length > 0) {
        const common = timed.flatMap((timing) => [...timing.onsets, timing.total]).filter((value) => value > 0).reduce(gcd, expected ?? 0)
        step = [16, 8, 4, 2, 1].find((candidate) => common % candidate === 0) ?? 1
    }
    const quantization = (32 / step) as Quantization

    // Spacing fallback: the shortest usual distance between two numbers is one eighth note.
    const gaps = raw.flatMap((measure) => measure.slots.slice(1).map((slot, index) => slot.x - measure.slots[index].x)).filter((gap) => gap > 4)
    const unit = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length * 0.15)] ?? 20
    const eighths = (gap: number) => Math.max(1, Math.min(MAX_STEPS_PER_GAP, Math.round(gap / unit)))

    let readMeasures = 0
    const measures = raw.map((measure, index): TabMeasure => {
        // Short measures are normal around pickups, repeats and alternate endings only.
        const mayBeShort =
            index === 0 || index === raw.length - 1 || Boolean(measure.marks.ending || measure.marks.repeatStart || measure.marks.repeatEnd)
        let columns: number[]
        let width: number
        const gapsHere = measure.slots.map((slot, index) => (measure.slots[index + 1]?.x ?? measure.end) - slot.x)

        if (measure.timing && (expected === null || measure.timing.total === expected || (mayBeShort && measure.timing.total < expected))) {
            readMeasures++
            columns = measure.timing.onsets.map((onset) => onset / step)
            width = measure.timing.total / step
        } else {
            const shared = expected !== null && Number.isInteger(expected / step) ? shareSteps(gapsHere, expected / step) : null
            const lengths = shared ?? gapsHere.map((gap) => Math.max(1, Math.round((eighths(gap) * 4) / step)))
            columns = lengths.map((_length, index) => lengths.slice(0, index).reduce((a, b) => a + b, 0))
            width = lengths.reduce((a, b) => a + b, 0) || Math.max(1, Math.round((expected ?? 16) / step))
        }

        width = Math.max(1, Math.min(MAX_TAB_COLUMNS_PER_MEASURE, Math.round(width)))
        const rows: string[][] = Array.from({ length: stringCount }, () => Array.from({ length: width }, () => ''))
        measure.slots.forEach((slot, index) => {
            const column = Math.min(Math.round(columns[index]), width - 1)
            for (const digit of slot.digits) {
                if (rows[digit.string][column] === '') rows[digit.string][column] = String(digit.fret)
            }
        })
        return { rows, ...measure.marks }
    })

    const total = expected ?? null
    const deduced: [number, number] | null =
        signature ?? (total === null ? null : total % 8 === 0 && (total / 8) % 3 !== 0 ? [total / 8, 4] : total % 4 === 0 ? [total / 4, 8] : null)
    return { measures, quantization, timeSignature: deduced, readMeasures }
}

/** Reads one page on its own (see readPdfPage and buildPdfMeasures for multi-page files). */
export function layoutPdfPage(page: PdfPageGeometry, expectedStrings?: number): PdfLayoutResult | null {
    const reading = readPdfPage(page, expectedStrings)
    if (!reading) return null
    const built = buildPdfMeasures(reading.measures, reading.stringCount, reading.timeSignature)
    return { stringCount: reading.stringCount, measures: built.measures, staves: reading.staves }
}

/** Rebuilds text lines (top to bottom) from positioned runs, keeping monospace alignment. */
export function pageTextLines(page: PdfPageGeometry): { text: string; height: number }[] {
    const rows = new Map<number, PdfText[]>()
    for (const text of page.texts) {
        if (text.str.trim() === '') continue
        const key = [...rows.keys()].find((y) => Math.abs(y - text.y) < 2) ?? text.y
        rows.set(key, [...(rows.get(key) ?? []), text])
    }
    return [...rows.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, runs]) => {
            const sorted = runs.sort((a, b) => a.x - b.x)
            return { text: sorted.map((run) => run.str).join(' '), height: Math.max(...sorted.map((run) => run.height)) }
        })
}
