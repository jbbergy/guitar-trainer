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

/**
 * Duration in seconds of one grid column given a tempo and quantization.
 * Formula: (4 / quantization) beats × (60 / bpm) seconds/beat
 */
export function columnDurationSeconds(bpm: number, quantization: number): number {
    return (4 / quantization) * (60 / bpm)
}

/**
 * Schedules a single plucked-string note via the Web Audio API.
 * The note uses a sawtooth oscillator with a fast attack and exponential decay
 * to approximate the envelope of a plucked string.
 */
export function playNote(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
): void {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(frequency, startTime)

    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.max(duration * 0.9, 0.05))

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
}
