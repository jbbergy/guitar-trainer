export type PitchClass =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11

export type AccidentalPreference = 'sharps' | 'flats'

export type NoteName =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'

const NOTE_TO_PITCH_CLASS: Record<NoteName, PitchClass> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11
}

const PITCH_CLASS_TO_NOTE_SHARPS: Record<PitchClass, NoteName> = {
  0: 'C',
  1: 'C#',
  2: 'D',
  3: 'D#',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'G#',
  9: 'A',
  10: 'A#',
  11: 'B'
}

const PITCH_CLASS_TO_NOTE_FLATS: Record<PitchClass, NoteName> = {
  0: 'C',
  1: 'Db',
  2: 'D',
  3: 'Eb',
  4: 'E',
  5: 'F',
  6: 'Gb',
  7: 'G',
  8: 'Ab',
  9: 'A',
  10: 'Bb',
  11: 'B'
}

export function toPitchClass(value: number): PitchClass {
  const normalized = ((value % 12) + 12) % 12
  return normalized as PitchClass
}

export function noteNameToPitchClass(noteName: NoteName): PitchClass {
  return NOTE_TO_PITCH_CLASS[noteName]
}

export function pitchClassToNoteName(
  pitchClass: PitchClass,
  preference: AccidentalPreference = 'sharps'
): NoteName {
  return preference === 'flats'
    ? PITCH_CLASS_TO_NOTE_FLATS[pitchClass]
    : PITCH_CLASS_TO_NOTE_SHARPS[pitchClass]
}

export const NOTE_NAME_OPTIONS: NoteName[] = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B'
]

