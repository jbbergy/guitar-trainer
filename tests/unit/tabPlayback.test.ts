import { describe, it, expect } from 'vitest'
import { fretToFrequency, columnDurationSeconds } from '@/utils/music/tabPlayback'

describe('fretToFrequency', () => {
    it('returns the open string frequency at fret 0', () => {
        // Guitar low E2 ≈ 82.41 Hz
        expect(fretToFrequency('guitar', 0, 0)).toBeCloseTo(82.41, 1)
        // Guitar high e4 ≈ 329.63 Hz
        expect(fretToFrequency('guitar', 5, 0)).toBeCloseTo(329.63, 1)
        // Ukulele A4 ≈ 440 Hz
        expect(fretToFrequency('ukulele', 3, 0)).toBeCloseTo(440.00, 1)
    })

    it('applies equal temperament: fret 12 doubles the frequency', () => {
        const openE = fretToFrequency('guitar', 0, 0)
        const octaveE = fretToFrequency('guitar', 0, 12)
        expect(octaveE).toBeCloseTo(openE * 2, 4)
    })

    it('applies equal temperament: each semitone multiplies by 2^(1/12)', () => {
        const f0 = fretToFrequency('guitar', 2, 0)
        const f1 = fretToFrequency('guitar', 2, 1)
        expect(f1).toBeCloseTo(f0 * Math.pow(2, 1 / 12), 4)
    })

    it('returns 0 for an out-of-range string index', () => {
        expect(fretToFrequency('guitar', 99, 0)).toBe(0)
        expect(fretToFrequency('ukulele', 10, 0)).toBe(0)
    })
})

describe('columnDurationSeconds', () => {
    it('quarter note at 120 BPM = 0.5 seconds', () => {
        expect(columnDurationSeconds(120, 4)).toBeCloseTo(0.5)
    })

    it('half note at 120 BPM = 1 second', () => {
        expect(columnDurationSeconds(120, 2)).toBeCloseTo(1.0)
    })

    it('whole note at 120 BPM = 2 seconds', () => {
        expect(columnDurationSeconds(120, 1)).toBeCloseTo(2.0)
    })

    it('eighth note at 120 BPM = 0.25 seconds', () => {
        expect(columnDurationSeconds(120, 8)).toBeCloseTo(0.25)
    })

    it('sixteenth note at 120 BPM = 0.125 seconds', () => {
        expect(columnDurationSeconds(120, 16)).toBeCloseTo(0.125)
    })

    it('thirty-second note at 120 BPM = 0.0625 seconds', () => {
        expect(columnDurationSeconds(120, 32)).toBeCloseTo(0.0625)
    })

    it('scales correctly with tempo', () => {
        // Quarter note at 60 BPM = 1 second
        expect(columnDurationSeconds(60, 4)).toBeCloseTo(1.0)
        // Quarter note at 240 BPM = 0.25 seconds
        expect(columnDurationSeconds(240, 4)).toBeCloseTo(0.25)
    })
})
