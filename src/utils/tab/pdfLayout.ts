import { MAX_TAB_COLUMNS_PER_MEASURE, MAX_TAB_FRET, type TabMeasure } from '@/types/tablature'

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

export interface PdfPageGeometry {
    width: number
    height: number
    texts: PdfText[]
    segments: PdfSegment[]
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

interface PlacedDigit {
    fret: number
    string: number
    /** Horizontal centre of the number */
    x: number
}

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

/**
 * Reads the tab staves of a page. Engraved tablatures carry no rhythm on the tab staff,
 * so the length of each note is estimated from the space left before the next one.
 */
export function layoutPdfPage(page: PdfPageGeometry, expectedStrings?: number): PdfLayoutResult | null {
    const candidates = findStaves(page)
        .map((staff) => ({ staff, digits: digitsOnStaff(page, staff) }))
        .filter((entry) => entry.digits.length > 0)
    if (candidates.length === 0) return null

    // Notation staves have 5 lines and no numbers; keep the string count used most.
    const counts = candidates.map((entry) => entry.staff.lines.length)
    const frequency = (count: number) => counts.filter((other) => other === count).length
    const stringCount = expectedStrings ?? [...counts].sort((a, b) => frequency(b) - frequency(a))[0]
    const staves = candidates.filter((entry) => entry.staff.lines.length === stringCount)
    if (staves.length === 0) return null

    // Slots: numbers sharing (almost) the same x are played together.
    const systems = staves.map(({ staff, digits }) => {
        const slots: { x: number; digits: PlacedDigit[] }[] = []
        for (const digit of [...digits].sort((a, b) => a.x - b.x)) {
            const last = slots[slots.length - 1]
            if (last && digit.x - last.x < 3.5 && !last.digits.some((other) => other.string === digit.string)) last.digits.push(digit)
            else slots.push({ x: digit.x, digits: [digit] })
        }
        return { bars: barPositions(page, staff), slots }
    })

    // The shortest usual distance between two notes is one step.
    const gaps = systems.flatMap((system) => system.slots.slice(1).map((slot, index) => slot.x - system.slots[index].x)).filter((gap) => gap > 4)
    const sortedGaps = [...gaps].sort((a, b) => a - b)
    const unit = sortedGaps[Math.floor(sortedGaps.length * 0.15)] ?? 20
    const stepsFor = (gap: number) => Math.max(1, Math.min(MAX_STEPS_PER_GAP, Math.round(gap / unit)))

    const measures: TabMeasure[] = []
    for (const system of systems) {
        for (let b = 0; b < system.bars.length - 1; b++) {
            const [start, end] = [system.bars[b], system.bars[b + 1]]
            const slots = system.slots.filter((slot) => slot.x >= start && slot.x < end)
            if (slots.length === 0) {
                // A bar-wide gap without notes right at the staff edges is the clef area, not a rest.
                if (b === 0 || end - start < unit) continue
            }

            const columns: number[] = []
            slots.forEach((slot, index) => {
                columns.push(index === 0 ? 0 : columns[index - 1] + stepsFor(slot.x - slots[index - 1].x))
            })
            const tail = slots.length > 0 ? stepsFor(end - slots[slots.length - 1].x) : 4
            const width = Math.min(MAX_TAB_COLUMNS_PER_MEASURE, (columns[columns.length - 1] ?? -1) + tail)

            const rows: string[][] = Array.from({ length: stringCount }, () => Array.from({ length: Math.max(1, width) }, () => ''))
            slots.forEach((slot, index) => {
                const column = Math.min(columns[index], rows[0].length - 1)
                for (const digit of slot.digits) {
                    if (rows[digit.string][column] === '') rows[digit.string][column] = String(digit.fret)
                }
            })
            measures.push({ rows })
        }
    }

    return measures.length > 0 ? { stringCount, measures, staves: staves.length } : null
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
