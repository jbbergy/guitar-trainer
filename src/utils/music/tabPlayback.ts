import type { Instrument } from '@/types/chord'

/**
 * Open string frequencies (Hz) indexed from string 0 (lowest) to string N-1 (highest).
 * Guitar:     E2  A2   D3   G3   B3   E4
 * Ukulele:    G4  C4   E4   A4   (re-entrant standard tuning)
 * Tin Whistle: D4  E4   F#4  G4   A4   B4
 */
const OPEN_STRING_FREQUENCIES: Record<Instrument, number[]> = {
    guitar:     [82.41, 110.00, 146.83, 196.00, 246.94, 329.63],
    ukulele:    [392.00, 261.63, 329.63, 440.00],
    tinWhistle: [293.66, 329.63, 369.99, 392.00, 440.00, 493.88],
}

/**
 * Returns the frequency of a fretted note using equal temperament.
 * Returns 0 when the string index is out of range.
 */
export function fretToFrequency(instrument: Instrument, stringIndex: number, fret: number): number {
    const openFreq = OPEN_STRING_FREQUENCIES[instrument]?.[stringIndex]
    if (openFreq === undefined) return 0
    return openFreq * Math.pow(2, fret / 12)
}

/** Frequency of a MIDI pitch (A4 = 69 = 440 Hz). */
export function midiToFrequency(pitch: number): number {
    return 440 * Math.pow(2, (pitch - 69) / 12)
}

/**
 * Duration in seconds of one grid column given a tempo and quantization.
 * Formula: (4 / quantization) beats × (60 / bpm) seconds/beat
 */
export function columnDurationSeconds(bpm: number, quantization: number): number {
    return (4 / quantization) * (60 / bpm)
}

export interface PlayNoteOptions {
    /** Node the note is connected to (defaults to the context destination) */
    destination?: AudioNode
    /** Peak level, 0–1 (default 0.25) */
    level?: number
    /** Hammer-on / pull-off / slide: softer attack */
    legato?: boolean
    /** Muted string: a short percussive click instead of a pitch */
    dead?: boolean
    /** Bend amount in semitones reached during the first half of the note */
    bend?: number
    /** Return to the original pitch at the end of the bend */
    bendRelease?: boolean
    vibrato?: boolean
}

/**
 * Schedules a single plucked-string note via the Web Audio API.
 * A sawtooth runs through a low-pass filter that closes as the note decays,
 * which approximates the bright attack and mellow tail of a plucked string.
 */
export function playNote(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    options: PlayNoteOptions = {},
): void {
    const oscillator = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()

    const length = options.dead ? Math.min(duration, 0.07) : Math.max(duration, 0.05)
    const peak = (options.level ?? 0.25) * (options.dead ? 0.7 : options.legato ? 0.6 : 1)
    const end = startTime + length

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(frequency, startTime)

    if (options.bend && !options.dead) {
        const bent = frequency * Math.pow(2, options.bend / 12)
        const top = startTime + Math.min(length * 0.45, 0.35)
        oscillator.frequency.linearRampToValueAtTime(bent, top)
        if (options.bendRelease) {
            oscillator.frequency.setValueAtTime(bent, startTime + length * 0.6)
            oscillator.frequency.linearRampToValueAtTime(frequency, startTime + length * 0.9)
        }
    }

    if (options.vibrato && !options.dead) {
        const lfo = ctx.createOscillator()
        const depth = ctx.createGain()
        lfo.frequency.setValueAtTime(5.5, startTime)
        depth.gain.setValueAtTime(0, startTime)
        depth.gain.linearRampToValueAtTime(frequency * 0.012, startTime + Math.min(0.25, length / 2))
        lfo.connect(depth)
        depth.connect(oscillator.frequency)
        lfo.start(startTime)
        lfo.stop(end)
    }

    filter.type = 'lowpass'
    filter.Q.setValueAtTime(0.7, startTime)
    filter.frequency.setValueAtTime(options.dead ? 900 : Math.min(9000, frequency * 7), startTime)
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, frequency * 1.5), startTime + Math.min(length, 0.6))

    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(peak, startTime + (options.legato ? 0.012 : 0.004))
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.max(length * 0.95, 0.04))

    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(options.destination ?? ctx.destination)

    oscillator.start(startTime)
    oscillator.stop(end)
}
