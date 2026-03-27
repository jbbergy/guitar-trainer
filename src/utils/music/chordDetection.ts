import type { PitchClass } from './pitchClass'
import { toPitchClass, pitchClassToNoteName } from './pitchClass'
import type { Instrument } from '@/types/chord'

interface ChordTemplate {
    name: string
    intervals: number[]
}

const CHORD_TEMPLATES: ChordTemplate[] = [
    { name: 'maj', intervals: [0, 4, 7] },
    { name: 'm', intervals: [0, 3, 7] },
    { name: '7', intervals: [0, 4, 7, 10] },
    { name: 'm7', intervals: [0, 3, 7, 10] },
    { name: 'maj7', intervals: [0, 4, 7, 11] },
    { name: 'dim', intervals: [0, 3, 6] },
    { name: 'aug', intervals: [0, 4, 8] },
    { name: 'sus2', intervals: [0, 2, 7] },
    { name: 'sus4', intervals: [0, 5, 7] },
    { name: '6', intervals: [0, 4, 7, 9] },
    { name: 'm6', intervals: [0, 3, 7, 9] },
    { name: '9', intervals: [0, 4, 7, 10, 2] },
    { name: 'add9', intervals: [0, 4, 7, 2] },
]

export interface DetectedChord {
    root: string
    quality: string
    fullName: string
    confidence: number
}

const A4_FREQ = 440

export function frequencyToMidi(freq: number): number {
    return 69 + 12 * Math.log2(freq / A4_FREQ)
}

export function frequencyToPitchClass(freq: number): PitchClass {
    const midi = frequencyToMidi(freq)
    return toPitchClass(Math.round(midi))
}

/**
 * Given a set of detected pitch classes, find the best matching chord.
 */
export function detectChordFromPitchClasses(
    pitchClasses: Set<PitchClass>,
    _instrument: Instrument = 'guitar'
): DetectedChord | null {
    if (pitchClasses.size < 2) return null

    const pcArray = Array.from(pitchClasses)
    let bestMatch: DetectedChord | null = null
    let bestScore = 0

    for (let root = 0; root < 12; root++) {
        for (const template of CHORD_TEMPLATES) {
            const expectedPCs = new Set(
                template.intervals.map((interval) => toPitchClass(root + interval))
            )

            let matchCount = 0
            for (const pc of pcArray) {
                if (expectedPCs.has(pc)) matchCount++
            }

            let coverCount = 0
            for (const expected of expectedPCs) {
                if (pitchClasses.has(expected)) coverCount++
            }

            const precision = matchCount / pcArray.length
            const recall = coverCount / expectedPCs.size
            const score = 0.4 * precision + 0.6 * recall

            const rootPC = toPitchClass(root)
            if (!pitchClasses.has(rootPC)) continue
            if (recall < 0.5) continue

            if (score > bestScore) {
                bestScore = score
                const rootName = pitchClassToNoteName(rootPC as PitchClass)
                const quality = template.name === 'maj' ? '' : template.name
                bestMatch = {
                    root: rootName,
                    quality,
                    fullName: rootName + quality,
                    confidence: Math.round(score * 100),
                }
            }
        }
    }

    if (bestMatch && bestMatch.confidence < 30) return null
    return bestMatch
}

/**
 * Detect multiple pitches from FFT frequency data.
 * Uses spectral peak-picking on the magnitude spectrum to find
 * prominent frequency components — works for chords (multiple simultaneous notes).
 */
export function detectPitchesFromFFT(
    frequencyData: Float32Array,
    sampleRate: number,
    fftSize: number
): number[] {
    const binCount = frequencyData.length
    const binWidth = sampleRate / fftSize

    // Frequency range: ~70 Hz (low D on guitar) to ~1500 Hz (covers ukulele + guitar harmonics)
    const minBin = Math.ceil(70 / binWidth)
    const maxBin = Math.min(Math.floor(1500 / binWidth), binCount - 2)

    // Find the noise floor (median of the spectrum in range)
    const valuesInRange: number[] = []
    for (let i = minBin; i <= maxBin; i++) {
        valuesInRange.push(frequencyData[i])
    }
    valuesInRange.sort((a, b) => a - b)
    const noiseFloor = valuesInRange[Math.floor(valuesInRange.length * 0.5)]

    // Dynamic threshold: noise floor + offset (in dB)
    const peakThreshold = Math.max(noiseFloor + 15, -60)

    // Find local maxima (peaks) above threshold
    const peaks: { bin: number; magnitude: number }[] = []
    for (let i = minBin + 1; i < maxBin; i++) {
        const mag = frequencyData[i]
        if (
            mag > peakThreshold &&
            mag > frequencyData[i - 1] &&
            mag > frequencyData[i + 1]
        ) {
            peaks.push({ bin: i, magnitude: mag })
        }
    }

    // Sort by magnitude (loudest first)
    peaks.sort((a, b) => b.magnitude - a.magnitude)

    // Take the top N peaks, filtering out peaks too close together (within ~1.5 semitones)
    const detectedFreqs: number[] = []
    const MAX_PEAKS = 8

    for (const peak of peaks) {
        if (detectedFreqs.length >= MAX_PEAKS) break

        // Parabolic interpolation for sub-bin accuracy
        const prev = frequencyData[peak.bin - 1] ?? peak.magnitude
        const curr = peak.magnitude
        const next = frequencyData[peak.bin + 1] ?? peak.magnitude
        const denom = prev - 2 * curr + next
        const shift = denom !== 0 ? 0.5 * (prev - next) / denom : 0
        const refinedBin = peak.bin + (Number.isFinite(shift) ? shift : 0)
        const freq = refinedBin * binWidth

        // Check this isn't too close to an already-picked frequency
        const tooClose = detectedFreqs.some((existing) => {
            const ratio = freq / existing
            // Within ~1.5 semitones: ratio between 2^(-1.5/12) and 2^(1.5/12)
            return ratio > 0.917 && ratio < 1.091
        })

        if (!tooClose) {
            detectedFreqs.push(freq)
        }
    }

    return detectedFreqs
}

/**
 * Check if there's enough signal energy in the time-domain buffer.
 */
export function computeRMS(buffer: Float32Array): number {
    let sum = 0
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i]
    }
    return Math.sqrt(sum / buffer.length)
}
