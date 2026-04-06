import type { Instrument } from '@/types/chord'
import type { PitchClass } from './pitchClass'
import { noteNameToPitchClass } from './pitchClass'

export type Tuning = {
  instrument: Instrument
  label: string
  openStringPitchClasses: PitchClass[]
}

export const TUNINGS: Record<Instrument, Tuning> = {
  guitar: {
    instrument: 'guitar',
    label: 'EADGBE',
    // Low E -> high E
    openStringPitchClasses: [
      noteNameToPitchClass('E'),
      noteNameToPitchClass('A'),
      noteNameToPitchClass('D'),
      noteNameToPitchClass('G'),
      noteNameToPitchClass('B'),
      noteNameToPitchClass('E')
    ]
  },
  ukulele: {
    instrument: 'ukulele',
    label: 'GCEA',
    // Standard re-entrant uke tuning (high G string). Pitch-class wise it's still G C E A.
    openStringPitchClasses: [
      noteNameToPitchClass('G'),
      noteNameToPitchClass('C'),
      noteNameToPitchClass('E'),
      noteNameToPitchClass('A')
    ]
  },
  tinWhistle: {
    instrument: 'tinWhistle',
    label: 'D',
    // Standard D tin whistle tuning (6 holes, but only 6 notes for simplicity)
    openStringPitchClasses: [
      noteNameToPitchClass('D'),
      noteNameToPitchClass('E'),
      noteNameToPitchClass('F#'),
      noteNameToPitchClass('G'),
      noteNameToPitchClass('A'),
      noteNameToPitchClass('B')
    ]
  }
}

export function getTuning(instrument: Instrument): Tuning {
  return TUNINGS[instrument]
}

