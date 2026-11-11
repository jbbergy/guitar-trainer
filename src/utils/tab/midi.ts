import type { TablatureDocument } from '@/types/tablature'
import { midiProgramFor, trackNameFor } from './alphaTex'
import { collectTabEvents, columnTicks, measureTimeSignature, measureToBeats, notePitch, TICKS_PER_QUARTER } from './rhythm'

const VELOCITY_NORMAL = 96
const VELOCITY_LEGATO = 72
const VELOCITY_DEAD = 54
const DEAD_NOTE_TICKS = 90

const textBytes = (text: string): number[] => [...new TextEncoder().encode(text)]

const uint32 = (value: number): number[] => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]

const uint16 = (value: number): number[] => [(value >>> 8) & 0xff, value & 0xff]

/** MIDI variable-length quantity. */
export function variableLength(value: number): number[] {
    const bytes = [value & 0x7f]
    let rest = value >>> 7
    while (rest > 0) {
        bytes.unshift((rest & 0x7f) | 0x80)
        rest >>>= 7
    }
    return bytes
}

interface TimedEvent {
    tick: number
    /** Lower values are written first when several events share a tick */
    priority: number
    data: number[]
}

const metaEvent = (type: number, data: number[]): number[] => [0xff, type, ...variableLength(data.length), ...data]

/** Serialises a track; the end-of-track event is placed at `endTick` so trailing silence is kept. */
const buildTrack = (events: TimedEvent[], endTick: number): number[] => {
    const sorted = [...events].sort((a, b) => a.tick - b.tick || a.priority - b.priority)
    const body: number[] = []
    let previous = 0
    for (const event of sorted) {
        body.push(...variableLength(event.tick - previous), ...event.data)
        previous = event.tick
    }
    body.push(...variableLength(Math.max(0, endTick - previous)), ...metaEvent(0x2f, []))
    return [...textBytes('MTrk'), ...uint32(body.length), ...body]
}

/** Writes the tablature as a Standard MIDI File (format 1: tempo track + one instrument track). */
export function tablatureToMidi(doc: TablatureDocument): Uint8Array {
    const grid = columnTicks(doc.quantization)
    const measureEvents = collectTabEvents(doc.measures)

    const conductor: TimedEvent[] = [
        { tick: 0, priority: 0, data: metaEvent(0x03, textBytes(doc.title)) },
        { tick: 0, priority: 1, data: metaEvent(0x51, uint32(Math.round(60_000_000 / doc.bpm)).slice(1)) },
    ]
    const track: TimedEvent[] = [
        { tick: 0, priority: 0, data: metaEvent(0x03, textBytes(trackNameFor(doc))) },
        { tick: 0, priority: 1, data: [0xc0, midiProgramFor(doc)] },
    ]

    let measureStart = 0
    let signature = ''
    for (const events of measureEvents) {
        const [numerator, denominator] = measureTimeSignature(events.columns, doc.quantization, doc.timeSignature)
        if (`${numerator}/${denominator}` !== signature) {
            signature = `${numerator}/${denominator}`
            conductor.push({
                tick: measureStart,
                priority: 2,
                data: metaEvent(0x58, [numerator, Math.round(Math.log2(denominator)), 24, 8]),
            })
        }

        for (const beat of measureToBeats(events, doc.quantization)) {
            for (const note of beat.notes) {
                const dead = note.fret === null
                const pitch = Math.max(0, Math.min(127, notePitch(doc.tuning.strings, doc.capo, note.string, note.fret ?? 0)))
                const start = measureStart + beat.startTicks
                const length = dead ? Math.min(DEAD_NOTE_TICKS, beat.value.ticks) : beat.value.ticks
                const velocity = dead ? VELOCITY_DEAD : note.legato ? VELOCITY_LEGATO : VELOCITY_NORMAL
                track.push({ tick: start, priority: 3, data: [0x90, pitch, velocity] })
                track.push({ tick: start + length, priority: 2, data: [0x80, pitch, 0] })
            }
        }
        measureStart += events.columns * grid
    }

    return new Uint8Array([
        ...textBytes('MThd'),
        ...uint32(6),
        ...uint16(1),
        ...uint16(2),
        ...uint16(TICKS_PER_QUARTER),
        ...buildTrack(conductor, measureStart),
        ...buildTrack(track, measureStart),
    ])
}
