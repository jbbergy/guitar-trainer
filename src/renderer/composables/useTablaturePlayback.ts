import { ref, onUnmounted } from 'vue'
import type { TablatureDocument } from '@/types/tablature'
import { columnDurationSeconds, midiToFrequency, playNote } from '@/utils/music/tabPlayback'
import { hasRepeats, measureStartColumns, playbackOrder } from '@/utils/tab/model'
import { collectTabEvents, notePitch, type TabNoteEvent } from '@/utils/tab/rhythm'

/**
 * How far ahead (in seconds) the scheduler pre-fills the audio timeline.
 * Large enough to absorb JS timer jitter; small enough not to delay stop().
 */
const SCHEDULE_AHEAD_TIME = 0.1

/**
 * How often (in ms) the scheduling loop runs.
 */
const SCHEDULER_INTERVAL = 25

/** A plucked string rings until it is played again, but never longer than this. */
const MAX_RING_SECONDS = 3

export interface PlaybackRange {
    /** First global column played (default 0) */
    startColumn?: number
    /** Column after the last one played (default: end of the tablature) */
    endColumn?: number
    /** Start again from startColumn when the end is reached */
    loop?: boolean
    /** Follow repeat signs and alternate endings (default: only when no endColumn is given) */
    followRepeats?: boolean
}

interface ScheduledNote {
    event: TabNoteEvent
    /** Number of columns before the same string is played again */
    ringColumns: number
}

export function useTablaturePlayback() {
    const isPlaying = ref(false)
    const playingColumn = ref<number | null>(null)

    let audioCtx: AudioContext | null = null
    let masterGain: GainNode | null = null
    let schedulerTimer: ReturnType<typeof setTimeout> | null = null
    let uiTimers: ReturnType<typeof setTimeout>[] = []

    // Playback cursor — mutated only inside the scheduler loop
    let nextColumnTime = 0
    /** Global columns in the order they are played, and the position of the cursor in that list */
    let sequence: number[] = []
    let sequenceIndex = 0
    let loop = false
    let colDuration = 0

    // Frozen view of the document taken the moment play() is called
    let notesByColumn: Map<number, ScheduledNote[]> = new Map()
    let openStrings: number[] = []
    let capo = 0

    const getOrCreateContext = (): AudioContext => {
        if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new AudioContext()
        }
        return audioCtx
    }

    /** Flattens the measures into notes keyed by global column, with how long each one rings. */
    const prepare = (doc: TablatureDocument): number => {
        const flat: { column: number; event: TabNoteEvent }[] = []
        let offset = 0
        for (const measure of collectTabEvents(doc.measures)) {
            for (const onset of measure.onsets) {
                for (const event of onset.notes) flat.push({ column: offset + onset.column, event })
            }
            offset += measure.columns
        }

        const nextOnString = new Map<number, number>()
        notesByColumn = new Map()
        for (let i = flat.length - 1; i >= 0; i--) {
            const { column, event } = flat[i]
            const next = nextOnString.get(event.string) ?? offset
            nextOnString.set(event.string, column)
            const list = notesByColumn.get(column) ?? []
            list.push({ event, ringColumns: Math.max(1, next - column) })
            notesByColumn.set(column, list)
        }
        return offset
    }

    /** Columns to play, in order: straight through a range, or following the repeat signs. */
    const buildSequence = (doc: TablatureDocument, start: number, end: number, expand: boolean): number[] => {
        if (!expand) return Array.from({ length: end - start }, (_unused, index) => start + index)

        const starts = measureStartColumns(doc.measures)
        const order = playbackOrder(doc.measures)
        const firstMeasure = starts.findIndex((_column, index) => start < starts[index + 1])
        const from = Math.max(0, order.indexOf(firstMeasure))
        const columns: number[] = []
        order.slice(from).forEach((measureIndex, position) => {
            const first = position === 0 ? Math.max(start, starts[measureIndex]) : starts[measureIndex]
            for (let column = first; column < starts[measureIndex + 1]; column++) columns.push(column)
        })
        return columns.length > 0 ? columns : [start]
    }

    /**
     * Schedules all notes for a given column index at the given audio timestamp.
     * Also queues a setTimeout to update the reactive playingColumn at the right moment.
     */
    const scheduleColumn = (ctx: AudioContext, columnIndex: number, columnTime: number): void => {
        for (const { event, ringColumns } of notesByColumn.get(columnIndex) ?? []) {
            const pitch = notePitch(openStrings, capo, event.string, event.fret ?? 0)
            playNote(ctx, midiToFrequency(pitch), columnTime, Math.min(MAX_RING_SECONDS, ringColumns * colDuration), {
                destination: masterGain ?? undefined,
                dead: event.fret === null,
                legato: event.legato,
                bend: event.bend,
                bendRelease: event.bendRelease,
                vibrato: event.technique === '~',
            })
        }

        // Sync the reactive cursor to the audio clock using a wall-clock delay
        const uiDelay = Math.max(0, (columnTime - ctx.currentTime) * 1000)
        uiTimers.push(globalThis.setTimeout(() => {
            if (isPlaying.value) {
                playingColumn.value = columnIndex
            }
        }, uiDelay))
    }

    /**
     * Lookahead scheduler (Chris Wilson pattern).
     * Processes all columns whose scheduled time falls within the lookahead window,
     * then reschedules itself unless the tablature has ended.
     */
    const scheduler = (): void => {
        const ctx = audioCtx
        if (!ctx || !isPlaying.value) return

        while (nextColumnTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
            scheduleColumn(ctx, sequence[sequenceIndex], nextColumnTime)
            nextColumnTime += colDuration
            sequenceIndex++

            if (sequenceIndex >= sequence.length) {
                if (loop) {
                    sequenceIndex = 0
                    continue
                }
                // Wait for the last column to finish, then stop
                const endDelay = Math.max(0, (nextColumnTime - ctx.currentTime) * 1000)
                schedulerTimer = globalThis.setTimeout(stop, endDelay)
                return
            }
        }

        schedulerTimer = globalThis.setTimeout(scheduler, SCHEDULER_INTERVAL)
    }

    /**
     * Starts playback. `range` is either the first column to play or a full range
     * (start, end, loop). If playback is already running it is stopped first.
     */
    const play = (doc: TablatureDocument, range: number | PlaybackRange = 0): void => {
        if (isPlaying.value) stop()

        const options: PlaybackRange = typeof range === 'number' ? { startColumn: range } : range
        const total = prepare(doc)
        if (total === 0) return

        const ctx = getOrCreateContext()
        if (ctx.state === 'suspended') {
            ctx.resume()
        }

        masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(1, ctx.currentTime)
        masterGain.connect(ctx.destination)

        openStrings = [...doc.tuning.strings]
        capo = doc.capo
        colDuration = columnDurationSeconds(doc.bpm, doc.quantization)
        const rangeEnd = Math.max(1, Math.min(options.endColumn ?? total, total))
        const rangeStart = Math.max(0, Math.min(options.startColumn ?? 0, rangeEnd - 1))
        const followRepeats = options.followRepeats ?? options.endColumn === undefined
        sequence = buildSequence(doc, rangeStart, rangeEnd, followRepeats && hasRepeats(doc.measures))
        sequenceIndex = 0
        loop = options.loop ?? false
        nextColumnTime = ctx.currentTime + 0.05  // small lead-in offset

        isPlaying.value = true
        playingColumn.value = null

        scheduler()
    }

    /**
     * Stops playback immediately, silences ringing notes and resets the cursor.
     */
    const stop = (): void => {
        if (schedulerTimer !== null) {
            globalThis.clearTimeout(schedulerTimer)
            schedulerTimer = null
        }
        uiTimers.forEach((timer) => globalThis.clearTimeout(timer))
        uiTimers = []

        if (masterGain && audioCtx) {
            const fading = masterGain
            const now = audioCtx.currentTime
            fading.gain.cancelScheduledValues(now)
            fading.gain.setValueAtTime(fading.gain.value, now)
            fading.gain.linearRampToValueAtTime(0, now + 0.03)
            globalThis.setTimeout(() => fading.disconnect(), 80)
            masterGain = null
        }

        isPlaying.value = false
        playingColumn.value = null
        notesByColumn = new Map()
    }

    onUnmounted(stop)

    return { isPlaying, playingColumn, play, stop }
}
