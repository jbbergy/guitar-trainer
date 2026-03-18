import type { PitchClass, NoteName } from './pitchClass'
import { noteNameToPitchClass, toPitchClass } from './pitchClass'

export type ScaleId =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'pentatonic_major'
  | 'pentatonic_minor'

export type ScaleDefinition = {
  id: ScaleId
  label: string
  intervals: number[]
}

export const SCALE_DEFINITIONS: ScaleDefinition[] = [
  { id: 'ionian', label: 'Ionian (Major)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'dorian', label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', label: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', label: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'aeolian', label: 'Aeolian (Natural minor)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'locrian', label: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'pentatonic_major', label: 'Pentatonic major', intervals: [0, 2, 4, 7, 9] },
  { id: 'pentatonic_minor', label: 'Pentatonic minor', intervals: [0, 3, 5, 7, 10] }
]

const SCALE_BY_ID: Record<ScaleId, ScaleDefinition> = SCALE_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.id] = def
    return acc
  },
  {} as Record<ScaleId, ScaleDefinition>
)

export function getScaleDefinition(scaleId: ScaleId): ScaleDefinition {
  return SCALE_BY_ID[scaleId]
}

export function getScalePitchClasses(root: NoteName, scaleId: ScaleId): PitchClass[] {
  const rootPc = noteNameToPitchClass(root)
  const def = getScaleDefinition(scaleId)

  return def.intervals.map(semitones => toPitchClass(rootPc + semitones))
}

