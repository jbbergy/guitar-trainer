import {
    MAX_TAB_COLUMNS_PER_MEASURE,
    MAX_TAB_FRET,
    MAX_TAB_MEASURES,
    TAB_QUANTIZATIONS,
    type Quantization,
    type TabInstrumentFamily,
    type TabMeasure,
    type TabTechnique,
    type TabTuning,
    type TablatureDocument,
} from '@/types/tablature'
import { createEmptyMeasure, createEmptyTablature, formatCell, isMeasureEmpty, repeatMarks } from './model'
import { createTuningFromStrings, detectTuningFromLabels, getTuningById, scientificToMidi } from './tunings'

export class TabImportError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'TabImportError'
    }
}

export interface AsciiImportOptions {
    /** Instrument family preferred when the text does not say which instrument it is for */
    preferredFamily?: TabInstrumentFamily
    /** Forces the tuning (ignored when its string count does not match the text) */
    tuning?: TabTuning
    /** Title used when the text does not contain one */
    fallbackTitle?: string
}

export interface AsciiImportResult {
    document: TablatureDocument
    warnings: string[]
}

interface TabLine {
    label: string | null
    body: string
    /** The line opens with a repeat sign ("|:") */
    leadRepeat: boolean
    /** Play count written after the last bar line ("| x3"), null when absent */
    tailCount: number | null
}

interface Token {
    pos: number
    /** Position of the time slot the token belongs to (differs from pos for right-aligned digits) */
    slot: number
    fret: number | null
    technique: TabTechnique | 'slide' | ''
    digits: number
    width: number
}

interface Segment {
    /** Slot offsets from the start of the measure, in characters */
    offsets: number[]
    /** Widest token of each slot, in characters */
    widths: number[]
    length: number
    /** tokens[slotIndex] = [stringIndex, token] pairs */
    tokens: [number, Token][][]
    repeatStart: boolean
    /** Play count of a repeat ending here, 0 when the measure does not close a repeat */
    repeatEnd: number
}

const LABEL_WITH_BAR = /^\s*([A-Ga-g][#b♯♭]?)\d?\s*([|:]+)/
const NUMBER_WITH_BAR = /^\s*\d\s*([|:]+)/
const LABEL_WITHOUT_BAR = /^\s*([A-Ga-g][#b♯♭]?)\s*(?=-{2,})/
const LEADING_BARS = /^\s*[|:]*/
const BODY_ALLOWED = /^[-0-9hHpPbBrRsStTvVxX/\\~^()<>[\]*.:| ]*$/
const DEFAULT_CHUNK_COLUMNS = 16

const normalizeText = (text: string): string =>
    text
        .replace(/\r\n?/g, '\n')
        .replace(/\t/g, '    ')
        .replace(/[‐-―−─━]/g, '-')
        .replace(/[│┃║¦‖]/g, '|')
        .replace(/\u00a0/g, ' ')

/** Recognises one line of a tab staff ("e|--0--2--|"). */
function parseTabLine(raw: string): TabLine | null {
    const line = raw.replace(/\s+$/, '')
    let label: string | null = null
    let rest: string
    let tailCount: number | null = null

    const labeled = LABEL_WITH_BAR.exec(line)
    const numbered = labeled ? null : NUMBER_WITH_BAR.exec(line)
    const bare = labeled || numbered ? null : LABEL_WITHOUT_BAR.exec(line)

    if (labeled) {
        label = labeled[1]
        rest = line.slice(labeled[0].length)
    } else if (numbered) {
        rest = line.slice(numbered[0].length)
    } else if (bare) {
        label = bare[1]
        rest = line.slice(bare[0].length)
    } else {
        rest = line.slice((LEADING_BARS.exec(line) as RegExpExecArray)[0].length)
    }

    // Drop annotations written after the last bar line ("| x2").
    const lastBar = rest.lastIndexOf('|')
    if (lastBar >= 0 && !rest.slice(lastBar + 1).includes('-')) {
        const count = /(?:x\s*(\d)|(\d)\s*x)/i.exec(rest.slice(lastBar + 1))
        if (count) tailCount = Number(count[1] ?? count[2])
        rest = rest.slice(0, lastBar + 1)
    }
    const leadRepeat = line.slice(0, line.length - rest.length).includes(':') && /[|:]\s*$/.test(line.slice(0, line.length - rest.length))

    if (!BODY_ALLOWED.test(rest)) return null

    const compact = rest.replace(/ /g, '')
    const dashes = (compact.match(/-/g) ?? []).length
    const structural = (compact.match(/[-0-9|]/g) ?? []).length
    if (dashes < 3 || structural / compact.length < 0.6) return null

    return { label, body: rest, leadRepeat, tailCount }
}

/** Splits a run of consecutive tab lines into staves of 3 to 8 strings. */
function splitRun(run: TabLine[]): TabLine[][] {
    if (run.length >= 3 && run.length <= 8) return [run]
    if (run.length < 3) return []

    for (const period of [6, 4, 7, 5, 8, 3]) {
        if (run.length % period !== 0) continue
        const repeats = run.every((line, index) => {
            const next = run[index + period]
            return !next || !line.label || !next.label || line.label.toLowerCase() === next.label.toLowerCase()
        })
        if (repeats) {
            return Array.from({ length: run.length / period }, (_unused, i) => run.slice(i * period, (i + 1) * period))
        }
    }
    return []
}

function findBlocks(lines: string[]): { blocks: TabLine[][]; firstTabLine: number } {
    const blocks: TabLine[][] = []
    let run: TabLine[] = []
    let firstTabLine = -1

    const flush = (endIndex: number) => {
        const split = splitRun(run)
        if (split.length > 0 && firstTabLine < 0) firstTabLine = endIndex - run.length
        blocks.push(...split)
        run = []
    }

    lines.forEach((line, index) => {
        const parsed = parseTabLine(line)
        if (parsed) run.push(parsed)
        else flush(index)
    })
    flush(lines.length)

    return { blocks, firstTabLine }
}

/** True when the text contains at least one tab staff. */
export function looksLikeAsciiTab(text: string): boolean {
    return findBlocks(normalizeText(text).split('\n')).blocks.length > 0
}

const techniqueFor = (ch: string | undefined): Token['technique'] => {
    switch (ch) {
        case 'h': case 'H': return 'h'
        case 'p': case 'P': return 'p'
        case '/': return '/'
        case '\\': return '\\'
        case 's': case 'S': return 'slide'
        case 'b': case 'B': case '^': return 'b'
        case 'r': case 'R': return 'r'
        case '~': case 'v': case 'V': return '~'
        default: return ''
    }
}

const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= '0' && ch <= '9'

function tokenizeLine(body: string, isBar: boolean[]): Token[] {
    const tokens: Token[] = []
    let i = 0

    while (i < body.length) {
        const ch = body[i]
        if (isBar[i]) {
            i++
            continue
        }

        if (isDigit(ch)) {
            let text = ch
            const next = body[i + 1]
            if (ch !== '0' && isDigit(next) && !isBar[i + 1] && Number(ch + next) <= MAX_TAB_FRET) {
                text += next
            }
            const after = i + text.length
            const technique = isBar[after] ? '' : techniqueFor(body[after])
            const width = text.length + (technique ? 1 : 0)
            tokens.push({ pos: i, slot: i, fret: Number(text), technique, digits: text.length, width })
            i += width
            continue
        }

        if (ch === 'x' || ch === 'X') {
            tokens.push({ pos: i, slot: i, fret: null, technique: '', digits: 1, width: 1 })
            i++
            continue
        }

        // A technique written away from its note ("5--h--7") links from the previous note.
        const technique = techniqueFor(ch)
        const last = tokens[tokens.length - 1]
        if (technique && last && last.fret !== null && last.technique === '') {
            last.technique = technique
        }
        i++
    }

    // "5s7": the slide direction depends on the note it reaches.
    tokens.forEach((token, index) => {
        if (token.technique !== 'slide') return
        const next = tokens[index + 1]
        token.technique = next && next.fret !== null && token.fret !== null && next.fret < token.fret ? '\\' : '/'
    })

    return tokens
}

/** Cuts one staff into measures and time slots. Lines are given highest string first. */
function parseBlock(block: TabLine[]): { segments: Segment[]; hasBars: boolean } {
    const stringCount = block.length
    const width = block.reduce((max, line) => Math.max(max, line.body.length), 0)
    const bodies = block.map((line) => line.body.padEnd(width, '-'))

    const isBar: boolean[] = Array.from({ length: width }, (_unused, i) => {
        const bars = bodies.reduce((count, body) => count + (body[i] === '|' ? 1 : 0), 0)
        return bars >= Math.max(1, Math.ceil(stringCount / 2))
    })

    // tokensByString[stringIndex], stringIndex 0 = lowest tab line = last text line.
    const tokensByString = bodies.map((body) => tokenizeLine(body, isBar)).reverse()

    // Right-aligned single digits under a two-digit fret belong to the same time slot.
    const doubleDigitStarts = new Set<number>()
    tokensByString.forEach((tokens) => tokens.forEach((token) => token.digits === 2 && doubleDigitStarts.add(token.pos)))
    tokensByString.forEach((tokens) => {
        const own = new Set(tokens.map((token) => token.pos))
        tokens.forEach((token) => {
            if (token.digits === 1 && doubleDigitStarts.has(token.pos - 1) && !own.has(token.pos - 1) && !isBar[token.pos - 1]) {
                token.slot = token.pos - 1
            }
        })
    })

    const boundaries: number[] = [-1]
    isBar.forEach((bar, i) => bar && boundaries.push(i))
    boundaries.push(width)

    const segments: Segment[] = []
    for (let b = 0; b < boundaries.length - 1; b++) {
        const start = boundaries[b] + 1
        const end = boundaries[b + 1]
        const length = end - start
        if (length <= 0) continue

        const slots = new Map<number, [number, Token][]>()
        tokensByString.forEach((tokens, stringIndex) => {
            tokens.forEach((token) => {
                if (token.slot < start || token.slot >= end) return
                const list = slots.get(token.slot) ?? []
                list.push([stringIndex, token])
                slots.set(token.slot, list)
            })
        })

        const positions = [...slots.keys()].sort((a, b2) => a - b2)
        const isLast = b === boundaries.length - 2
        // Nothing but a short tail after the last bar line: not a measure.
        if (positions.length === 0 && (isLast || length < 2) && boundaries.length > 2) continue

        // Repeat dots sit right inside the bar lines: "|:" opens a section, ":|" closes it.
        const isDot = (position: number) => bodies.some((body) => body[position] === ':' || body[position] === '*')
        const repeatStart = isDot(start) || (b === 0 && block.some((line) => line.leadRepeat))
        const repeatEnd = end < width && length > 1 && isDot(end - 1) ? 2 : 0

        segments.push({
            repeatStart,
            repeatEnd,
            offsets: positions.map((position) => position - start),
            widths: positions.map((position) =>
                (slots.get(position) as [number, Token][]).reduce((max, [, token]) => Math.max(max, token.width), 1)
            ),
            length,
            tokens: positions.map((position) => slots.get(position) as [number, Token][]),
        })
    }

    // "| x3" after a staff: its last repeat is played that many times; without any
    // repeat sign the whole staff is the repeated section.
    const tailCount = block.reduce<number | null>((count, line) => count ?? line.tailCount, null)
    if (tailCount !== null && tailCount >= 2 && segments.length > 0) {
        const closing = [...segments].reverse().find((segment) => segment.repeatEnd > 0)
        if (closing) {
            closing.repeatEnd = tailCount
        } else {
            segments[0].repeatStart = true
            segments[segments.length - 1].repeatEnd = tailCount
        }
    }

    return { segments, hasBars: boundaries.length > 2 }
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** Greatest common step of the positions, tolerating a few misaligned notes. */
function tolerantGcd(values: number[]): number {
    const positive = values.filter((value) => value > 0)
    if (positive.length === 0) return 0

    const exact = positive.reduce(gcd)
    if (exact >= 2) return exact

    const largest = Math.min(12, Math.max(...positive))
    for (let step = largest; step >= 2; step--) {
        const aligned = positive.filter((value) => value % step === 0).length
        if (aligned / positive.length >= 0.9) return step
    }
    return 1
}

interface Layout {
    lead: number
    compensated: boolean
    step: number
}

const relativePositions = (segment: Segment, layout: Pick<Layout, 'lead' | 'compensated'>): number[] => {
    let extra = 0
    return segment.offsets.map((offset, index) => {
        const relative = Math.max(0, offset - layout.lead) - (layout.compensated ? extra : 0)
        extra += segment.widths[index] - 1
        return relative
    })
}

/**
 * Finds how many characters make one time step. Text tabs either keep notes on a
 * regular character grid, or keep a regular number of dashes between notes: both
 * readings are tried and the one giving the coarsest regular grid wins.
 */
function detectLayout(segments: Segment[], explicitStep: number | null): Layout {
    if (explicitStep !== null) {
        return { lead: 1, compensated: false, step: explicitStep }
    }

    const candidates: Pick<Layout, 'lead' | 'compensated'>[] = [
        { lead: 1, compensated: false },
        { lead: 0, compensated: false },
        { lead: 1, compensated: true },
        { lead: 0, compensated: true },
    ]

    let best: Layout = { lead: 1, compensated: false, step: 0 }
    for (const candidate of candidates) {
        const step = tolerantGcd(segments.flatMap((segment) => relativePositions(segment, candidate)))
        if (step > best.step) best = { ...candidate, step }
    }
    return { ...best, step: Math.max(1, best.step) }
}

const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const mostCommon = (values: number[]): number => {
    const counts = new Map<number, number>()
    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
    let best = values[0] ?? 0
    counts.forEach((count, value) => {
        if (count > (counts.get(best) ?? 0)) best = value
    })
    return best
}

/** Assumes a measure is roughly one 4/4 bar and picks the closest binary grid. */
const guessQuantization = (columns: number): Quantization => {
    const options: Quantization[] = [4, 8, 16, 32]
    return options.reduce((best, option) =>
        Math.abs(Math.log(columns / option)) < Math.abs(Math.log(columns / best)) ? option : best
    )
}

interface Metadata {
    title: string | null
    artist: string | null
    capo: number
    bpm: number | null
    quantization: Quantization | null
    step: number | null
    tuningStrings: number[] | null
    tuningNames: string[] | null
}

const METADATA_LINE =
    /^\s*(?:(?:title|song|name|artist|band|author|by|tuning|capo|tempo|bpm|grid|key|time|difficulty)\s*[:=]|(?:capo|tabbed|transcribed|tempo|bpm)\b)/i

function readMetadata(lines: string[], firstTabLine: number): Metadata {
    const meta: Metadata = {
        title: null, artist: null, capo: 0, bpm: null, quantization: null, step: null, tuningStrings: null, tuningNames: null,
    }
    const header = lines.slice(0, firstTabLine < 0 ? lines.length : firstTabLine)

    for (const line of lines) {
        const title = /^\s*(?:title|song|name)\s*[:=-]\s*(.+)$/i.exec(line)
        if (title && !meta.title) meta.title = title[1].trim()

        const artist = /^\s*(?:artist|band|author|by)\s*[:=-]\s*(.+)$/i.exec(line)
        if (artist && !meta.artist) meta.artist = artist[1].trim()

        const capo = /\bcapo\b[^0-9\n]{0,12}(\d{1,2})/i.exec(line)
        if (capo && meta.capo === 0) meta.capo = Math.min(12, Number(capo[1]))

        const tempo = /\b(?:tempo|bpm)\b[^0-9\n]{0,6}(\d{2,3})/i.exec(line) ?? /(\d{2,3})\s*bpm\b/i.exec(line)
        if (tempo && meta.bpm === null) meta.bpm = Number(tempo[1])

        const grid = /^\s*grid\s*[:=]\s*1\/(\d{1,2})(?:\D+(\d{1,2})\s*chars? per step)?/i.exec(line)
        if (grid && meta.quantization === null) {
            const value = Number(grid[1]) as Quantization
            if (TAB_QUANTIZATIONS.includes(value)) meta.quantization = value
            if (grid[2]) meta.step = Math.max(1, Number(grid[2]))
        }

        const tuning = /^\s*tuning\s*[:=-]\s*(.+)$/i.exec(line)
        if (tuning && !meta.tuningStrings && !meta.tuningNames) {
            const words = tuning[1].replace(/\(.*$/, '').trim().split(/[\s,]+/).filter(Boolean)
            const pitches = words.map(scientificToMidi)
            if (words.length >= 3 && pitches.every((pitch) => pitch !== null)) {
                meta.tuningStrings = pitches as number[]
            } else if (words.length >= 3 && words.every((word) => /^[A-Ga-g][#b♯♭]?$/.test(word))) {
                meta.tuningNames = words
            } else if (words.length === 1 && /^([A-G][#b]?){3,8}$/.test(words[0])) {
                meta.tuningNames = words[0].match(/[A-G][#b]?/g)
            }
        }
    }

    if (!meta.title) {
        const candidate = header.find((line) => {
            const text = line.trim()
            return text.length > 0 && text.length <= 100 && !METADATA_LINE.test(text) && !/^[[(#<]|https?:/i.test(text)
        })
        if (candidate) meta.title = candidate.trim()
    }

    return meta
}

/**
 * Parses a plain-text tablature. Lyrics, chord names and comments are ignored;
 * every group of 3 to 8 aligned tab lines becomes a row of measures.
 */
export function parseAsciiTab(text: string, options: AsciiImportOptions = {}): AsciiImportResult {
    const lines = normalizeText(text).split('\n')
    const { blocks, firstTabLine } = findBlocks(lines)
    const warnings: string[] = []

    if (blocks.length === 0) {
        throw new TabImportError('No tablature lines were found in this text.')
    }

    // The instrument is the string count used by most staves; 6 then 4 win ties.
    const sizes = blocks.map((block) => block.length)
    const stringCount = [...new Set(sizes)].sort((a, b) => {
        const diff = sizes.filter((size) => size === b).length - sizes.filter((size) => size === a).length
        if (diff !== 0) return diff
        const rank = (size: number) => (size === 6 ? 0 : size === 4 ? 1 : 2)
        return rank(a) - rank(b)
    })[0]

    const staves = blocks.filter((block) => block.length === stringCount)
    if (staves.length < blocks.length) {
        warnings.push(`${blocks.length - staves.length} staff block(s) with a different number of strings were skipped.`)
    }

    const meta = readMetadata(lines, firstTabLine)
    const parsedBlocks = staves.map(parseBlock)
    const hasBars = parsedBlocks.some((block) => block.hasBars)
    const segments = parsedBlocks.flatMap((block) => block.segments)
    const layout = detectLayout(segments, meta.step)

    let dropped = 0
    let measures: TabMeasure[] = []

    for (const segment of segments) {
        const relative = relativePositions(segment, layout)
        const extra = layout.compensated ? segment.widths.reduce((sum, width) => sum + width - 1, 0) : 0
        const columnOf = (value: number) => Math.round(value / layout.step)
        const lastColumn = relative.length > 0 ? columnOf(relative[relative.length - 1]) : -1
        const columns = Math.max(lastColumn + 1, Math.round((segment.length - layout.lead - extra) / layout.step))
        if (columns < 1) continue

        const rows: string[][] = Array.from({ length: stringCount }, () => Array.from({ length: columns }, () => ''))
        segment.tokens.forEach((slotTokens, slotIndex) => {
            const column = Math.min(columns - 1, columnOf(relative[slotIndex]))
            slotTokens.forEach(([stringIndex, token]) => {
                const cell = formatCell(token.fret, token.fret === null ? '' : (token.technique as TabTechnique | ''))
                const target = rows[stringIndex][column] === '' ? column : column + 1
                if (target < columns && rows[stringIndex][target] === '') rows[stringIndex][target] = cell
                else dropped++
            })
        })
        measures.push({ rows, ...repeatMarks({ repeatStart: segment.repeatStart, repeatEnd: segment.repeatEnd }) })
    }

    // Wide measures (tabs written without bar lines) are cut into regular chunks.
    const chunkSize = hasBars ? MAX_TAB_COLUMNS_PER_MEASURE : DEFAULT_CHUNK_COLUMNS
    if (measures.some((measure) => measure.rows[0].length > chunkSize)) {
        if (hasBars) warnings.push(`Measures longer than ${chunkSize} steps were split.`)
        measures = measures.flatMap((measure) => {
            const width = measure.rows[0].length
            if (width <= chunkSize) return [measure]
            const chunks: TabMeasure[] = []
            for (let start = 0; start < width; start += chunkSize) {
                chunks.push({ rows: measure.rows.map((row) => row.slice(start, start + chunkSize)) })
            }
            const last = chunks[chunks.length - 1]
            const kept = isMeasureEmpty(last) && last.rows[0].length < chunkSize / 2 ? chunks.slice(0, -1) : chunks
            if (measure.repeatStart) kept[0].repeatStart = true
            if (measure.repeatEnd) kept[kept.length - 1].repeatEnd = measure.repeatEnd
            return kept
        })
    }

    if (measures.length === 0) {
        throw new TabImportError('The tablature lines do not contain any measure.')
    }
    if (measures.length > MAX_TAB_MEASURES) {
        warnings.push(`Only the first ${MAX_TAB_MEASURES} measures were imported.`)
        measures = measures.slice(0, MAX_TAB_MEASURES)
    }
    if (dropped > 0) {
        warnings.push(`${dropped} note(s) overlapped another note and were dropped.`)
    }

    // Tuning: explicit option, then header, then string labels, then a default for the string count.
    const labeledStave = staves.find((block) => block.every((line) => line.label !== null)) ?? staves[0]
    const labels = labeledStave.map((line) => line.label).reverse()
    const preferredFamily = options.preferredFamily ?? 'guitar'

    let tuning: TabTuning
    if (options.tuning && options.tuning.strings.length === stringCount) {
        tuning = options.tuning
    } else if (meta.tuningStrings && meta.tuningStrings.length === stringCount) {
        tuning = createTuningFromStrings(meta.tuningStrings)
    } else if (labels.every((label) => label === null) && meta.tuningNames && meta.tuningNames.length === stringCount) {
        tuning = detectTuningFromLabels(meta.tuningNames, preferredFamily)
    } else {
        tuning = detectTuningFromLabels(labels, preferredFamily)
    }

    // "GCEA" labels fit both ukulele tunings: trust a heading that names the low G.
    if (tuning.id === 'ukulele-standard' && !options.tuning && /\blow[\s-]?g\b|sol grave/i.test(lines.slice(0, 12).join('\n'))) {
        tuning = getTuningById('ukulele-low-g') ?? tuning
    }

    const widths = measures.map((measure) => measure.rows[0].length)
    const columnsPerMeasure = Math.min(MAX_TAB_COLUMNS_PER_MEASURE, mostCommon(widths))
    const document = createEmptyTablature(tuning, {
        title: meta.title ?? options.fallbackTitle ?? 'Imported tablature',
        artist: meta.artist ?? '',
        capo: meta.capo,
        bpm: meta.bpm ?? undefined,
        quantization: meta.quantization ?? guessQuantization(median(widths)),
        columnsPerMeasure,
    })
    document.measures = measures.length > 0 ? measures : [createEmptyMeasure(stringCount, columnsPerMeasure)]

    return { document, warnings }
}
