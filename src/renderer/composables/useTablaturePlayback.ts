import { ref, onUnmounted } from 'vue'
import type { TablatureDocument } from '@/types/tablature'
import { fretToFrequency, columnDurationSeconds, playNote } from '@/utils/music/tabPlayback'

/**
 * How far ahead (in seconds) the scheduler pre-fills the audio timeline.
 * Large enough to absorb JS timer jitter; small enough not to delay stop().
 */
const SCHEDULE_AHEAD_TIME = 0.1

/**
 * How often (in ms) the scheduling loop runs.
 */
const SCHEDULER_INTERVAL = 25

export function useTablaturePlayback() {
    const isPlaying = ref(false)
    const playingColumn = ref<number | null>(null)

    let audioCtx: AudioContext | null = null
    let schedulerTimer: ReturnType<typeof setTimeout> | null = null

    // Playback cursor — mutated only inside the scheduler loop
    let nextColumnTime = 0
    let currentColumnIndex = 0
    let totalColumns = 0
    let colDuration = 0

    // Frozen copy of the document taken the moment play() is called
    let documentSnapshot: TablatureDocument | null = null

    const getOrCreateContext = (): AudioContext => {
        if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new AudioContext()
        }
        return audioCtx
    }

    /**
     * Schedules all notes for a given column index at the given audio timestamp.
     * Also queues a setTimeout to update the reactive playingColumn at the right moment.
     */
    const scheduleColumn = (ctx: AudioContext, columnIndex: number, columnTime: number): void => {
        if (!documentSnapshot) return
        const { instrument, measures, columnsPerMeasure } = documentSnapshot

        const measureIndex = Math.floor(columnIndex / columnsPerMeasure)
        const localCol = columnIndex % columnsPerMeasure
        const measure = measures[measureIndex]
        if (!measure) return

        for (let stringIndex = 0; stringIndex < measure.rows.length; stringIndex++) {
            const cell = measure.rows[stringIndex]?.[localCol]
            if (!cell || cell === '' || cell === 'x') continue

            const fret = parseInt(cell, 10)
            if (Number.isNaN(fret)) continue

            const freq = fretToFrequency(instrument, stringIndex, fret)
            if (freq > 0) {
                playNote(ctx, freq, columnTime, colDuration * 0.9)
            }
        }

        // Sync the reactive cursor to the audio clock using a wall-clock delay
        const uiDelay = Math.max(0, (columnTime - ctx.currentTime) * 1000)
        globalThis.setTimeout(() => {
            if (isPlaying.value) {
                playingColumn.value = columnIndex
            }
        }, uiDelay)
    }

    /**
     * Lookahead scheduler (Chris Wilson pattern).
     * Processes all columns whose scheduled time falls within the lookahead window,
     * then reschedules itself unless the tablature has ended.
     */
    const scheduler = (): void => {
        const ctx = audioCtx
        if (!ctx || !documentSnapshot) return

        while (nextColumnTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
            scheduleColumn(ctx, currentColumnIndex, nextColumnTime)
            nextColumnTime += colDuration
            currentColumnIndex++

            if (currentColumnIndex >= totalColumns) {
                // Wait for the last column to finish, then stop
                const endDelay = Math.max(0, (nextColumnTime - ctx.currentTime) * 1000)
                globalThis.setTimeout(stop, endDelay)
                return
            }
        }

        schedulerTimer = globalThis.setTimeout(scheduler, SCHEDULER_INTERVAL)
    }

    /**
     * Starts playback from the given column index (defaults to 0).
     * If playback is already running it is stopped first.
     */
    const play = (doc: TablatureDocument, startColumn = 0): void => {
        if (isPlaying.value) stop()

        const ctx = getOrCreateContext()
        if (ctx.state === 'suspended') {
            ctx.resume()
        }

        documentSnapshot = doc
        totalColumns = doc.measures.length * doc.columnsPerMeasure
        colDuration = columnDurationSeconds(doc.bpm, doc.quantization)
        currentColumnIndex = Math.max(0, Math.min(startColumn, totalColumns - 1))
        nextColumnTime = ctx.currentTime + 0.05  // small lead-in offset

        isPlaying.value = true
        playingColumn.value = null

        scheduler()
    }

    /**
     * Stops playback immediately and resets the cursor.
     */
    const stop = (): void => {
        if (schedulerTimer !== null) {
            globalThis.clearTimeout(schedulerTimer)
            schedulerTimer = null
        }
        isPlaying.value = false
        playingColumn.value = null
        documentSnapshot = null
    }

    onUnmounted(stop)

    return { isPlaying, playingColumn, play, stop }
}
