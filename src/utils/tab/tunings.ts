import type { Instrument } from '@/types/chord'
import type { TabInstrumentFamily, TabTuning } from '@/types/tablature'

/**
 * Tuning presets. `strings` lists open-string MIDI pitches from the lowest tab line
 * to the highest one (string order, not pitch order: the ukulele G string comes first
 * even when it is tuned an octave up).
 */
export const TAB_TUNINGS: TabTuning[] = [
    { id: 'guitar-standard', family: 'guitar', name: 'Guitar · Standard (EADGBE)', strings: [40, 45, 50, 55, 59, 64] },
    { id: 'guitar-drop-d', family: 'guitar', name: 'Guitar · Drop D (DADGBE)', strings: [38, 45, 50, 55, 59, 64] },
    { id: 'guitar-half-step-down', family: 'guitar', name: 'Guitar · Half step down (E♭)', strings: [39, 44, 49, 54, 58, 63] },
    { id: 'guitar-dadgad', family: 'guitar', name: 'Guitar · DADGAD', strings: [38, 45, 50, 55, 57, 62] },
    { id: 'guitar-open-g', family: 'guitar', name: 'Guitar · Open G (DGDGBD)', strings: [38, 43, 50, 55, 59, 62] },
    { id: 'guitar-open-d', family: 'guitar', name: 'Guitar · Open D (DADF♯AD)', strings: [38, 45, 50, 54, 57, 62] },
    { id: 'guitar-7-string', family: 'guitar', name: 'Guitar · 7 strings (BEADGBE)', strings: [35, 40, 45, 50, 55, 59, 64] },
    { id: 'ukulele-standard', family: 'ukulele', name: 'Ukulele · Standard high G (gCEA)', strings: [67, 60, 64, 69] },
    { id: 'ukulele-low-g', family: 'ukulele', name: 'Ukulele · Low G (GCEA)', strings: [55, 60, 64, 69] },
    { id: 'ukulele-baritone', family: 'ukulele', name: 'Baritone ukulele (DGBE)', strings: [50, 55, 59, 64] },
    { id: 'ukulele-d', family: 'ukulele', name: 'Ukulele · D tuning (aDF♯B)', strings: [69, 62, 66, 71] },
    { id: 'bass-standard', family: 'bass', name: 'Bass · Standard (EADG)', strings: [28, 33, 38, 43] },
]

export const DEFAULT_GUITAR_TUNING_ID = 'guitar-standard'
export const DEFAULT_UKULELE_TUNING_ID = 'ukulele-standard'
export const BARITONE_UKULELE_TUNING_ID = 'ukulele-baritone'

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const NOTE_LETTER_PITCH_CLASS: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }

const cloneTuning = (tuning: TabTuning): TabTuning => ({ ...tuning, strings: [...tuning.strings] })

export function getTuningById(id: string): TabTuning | null {
    const found = TAB_TUNINGS.find((tuning) => tuning.id === id)
    return found ? cloneTuning(found) : null
}

export function getDefaultTuning(family: TabInstrumentFamily = 'guitar'): TabTuning {
    const id = family === 'ukulele' ? DEFAULT_UKULELE_TUNING_ID : family === 'bass' ? 'bass-standard' : DEFAULT_GUITAR_TUNING_ID
    return getTuningById(id) as TabTuning
}

/** Tuning used when the app-wide instrument toggle drives a new tablature. */
export function getTuningForInstrument(instrument: Instrument): TabTuning {
    return getDefaultTuning(instrument === 'ukulele' ? 'ukulele' : 'guitar')
}

export function tuningsByFamily(family: TabInstrumentFamily): TabTuning[] {
    return TAB_TUNINGS.filter((tuning) => tuning.family === family).map(cloneTuning)
}

/** MIDI pitch → note name without octave ("F#"). */
export function midiToNoteName(pitch: number): string {
    return SHARP_NAMES[((Math.round(pitch) % 12) + 12) % 12]
}

/** MIDI pitch → scientific pitch name ("F#3", middle C = C4 = 60). */
export function midiToScientific(pitch: number): string {
    const rounded = Math.round(pitch)
    return `${midiToNoteName(rounded)}${Math.floor(rounded / 12) - 1}`
}

/** "F#" / "Bb" / "e" → pitch class 0–11, or null when the text is not a note name. */
export function noteNameToPitchClassLoose(name: string): number | null {
    const match = /^([A-Ga-g])([#b♯♭]?)$/.exec(name.trim())
    if (!match) return null
    const base = NOTE_LETTER_PITCH_CLASS[match[1].toLowerCase()]
    const accidental = match[2] === '#' || match[2] === '♯' ? 1 : match[2] === 'b' || match[2] === '♭' ? -1 : 0
    return (base + accidental + 12) % 12
}

/** "E2" / "F#3" / "Bb1" → MIDI pitch, or null when the text is not a scientific pitch. */
export function scientificToMidi(name: string): number | null {
    const match = /^([A-Ga-g][#b♯♭]?)(-?\d)$/.exec(name.trim())
    if (!match) return null
    const pitchClass = noteNameToPitchClassLoose(match[1])
    if (pitchClass === null) return null
    return (Number(match[2]) + 1) * 12 + pitchClass
}

/**
 * Labels printed in front of each tab line, indexed like `tuning.strings`.
 * When a note name appears twice the higher string is written in lower case (E … e).
 */
export function getStringLabels(tuning: TabTuning): string[] {
    const seen = new Set<string>()
    return tuning.strings.map((pitch) => {
        const name = midiToNoteName(pitch)
        if (seen.has(name)) return name.toLowerCase()
        seen.add(name)
        return name
    })
}

/** Short description of a tuning, lowest tab line first: "E A D G B E". */
export function describeTuningNotes(tuning: TabTuning): string {
    return tuning.strings.map(midiToNoteName).join(' ')
}

export function isSameTuning(a: TabTuning, b: TabTuning): boolean {
    return a.strings.length === b.strings.length && a.strings.every((pitch, index) => pitch === b.strings[index])
}

/** Finds the preset holding exactly these open-string pitches. */
export function findTuningByStrings(strings: number[]): TabTuning | null {
    const found = TAB_TUNINGS.find(
        (tuning) => tuning.strings.length === strings.length && tuning.strings.every((pitch, index) => pitch === strings[index])
    )
    return found ? cloneTuning(found) : null
}

const guessFamily = (strings: number[]): TabInstrumentFamily => {
    const lowest = Math.min(...strings)
    if (strings.length === 4 && lowest >= 48) return 'ukulele'
    if (strings.length <= 5 && lowest < 36) return 'bass'
    if (strings.length >= 6) return 'guitar'
    return 'other'
}

/** Builds a tuning from raw pitches, reusing a preset when one matches. */
export function createTuningFromStrings(strings: number[], family?: TabInstrumentFamily): TabTuning {
    const preset = findTuningByStrings(strings)
    if (preset) return preset
    return {
        id: 'custom',
        family: family ?? guessFamily(strings),
        name: `Custom (${strings.map(midiToNoteName).join(' ')})`,
        strings: [...strings],
    }
}

/**
 * Default open strings for a string count that has no dedicated preset:
 * the guitar is extended downwards in fourths or trimmed from the bottom.
 */
const defaultStringsForCount = (count: number): number[] => {
    const guitar = [40, 45, 50, 55, 59, 64]
    if (count <= 6) return guitar.slice(6 - count)
    const extended = [...guitar]
    while (extended.length < count) extended.unshift(extended[0] - 5)
    return extended
}

/**
 * Picks a tuning from the string labels of a text tablature.
 * `labels` are indexed like `strings` (lowest tab line first); a null entry means "no label".
 */
export function detectTuningFromLabels(
    labels: (string | null)[],
    preferredFamily: TabInstrumentFamily = 'guitar'
): TabTuning {
    const count = labels.length
    const pitchClasses = labels.map((label) => (label ? noteNameToPitchClassLoose(label) : null))
    const candidates = TAB_TUNINGS.filter((tuning) => tuning.strings.length === count)
    const byPreference = [
        ...candidates.filter((tuning) => tuning.family === preferredFamily),
        ...candidates.filter((tuning) => tuning.family !== preferredFamily),
    ]
    const fallback = byPreference[0] ? cloneTuning(byPreference[0]) : createTuningFromStrings(defaultStringsForCount(count))

    if (pitchClasses.some((pitchClass) => pitchClass === null)) {
        return fallback
    }

    // Presets are ordered so that the most common tuning of each family wins on ties.
    const exact = candidates.find((tuning) =>
        tuning.strings.every((pitch, index) => ((pitch % 12) + 12) % 12 === pitchClasses[index])
    )
    if (exact) return cloneTuning(exact)

    // Unknown tuning: retune the fallback string by string to the closest matching pitch.
    const strings = fallback.strings.map((pitch, index) => {
        const target = pitchClasses[index] as number
        let delta = (target - (((pitch % 12) + 12) % 12) + 12) % 12
        if (delta > 6) delta -= 12
        return pitch + delta
    })
    return createTuningFromStrings(strings, fallback.family)
}

/** App-wide instrument matching a tuning family (used to pick the chord dictionary). */
export function tuningToInstrument(tuning: TabTuning): Instrument | null {
    if (tuning.family === 'guitar') return 'guitar'
    if (tuning.family === 'ukulele') return 'ukulele'
    return null
}
