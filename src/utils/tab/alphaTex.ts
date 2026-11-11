import type { TablatureDocument } from '@/types/tablature'
import { collectTabEvents, measureTimeSignature, measureToBeats, type NotatedBeat, type TabNoteEvent } from './rhythm'
import { midiToScientific } from './tunings'

/** General MIDI program (0-based) used for playback by the tools reading the export. */
export function midiProgramFor(doc: TablatureDocument): number {
    if (doc.tuning.family === 'bass') return 33
    if (doc.tuning.family === 'ukulele') return 24
    return 25
}

export function trackNameFor(doc: TablatureDocument): string {
    if (doc.tuning.id === 'ukulele-baritone') return 'Baritone ukulele'
    if (doc.tuning.family === 'ukulele') return 'Ukulele'
    if (doc.tuning.family === 'bass') return 'Bass'
    return 'Guitar'
}

const quote = (text: string): string => `"${text.replace(/\\/g, '/').replace(/"/g, "'").replace(/\s+/g, ' ').trim()}"`

const noteText = (note: TabNoteEvent, stringCount: number): string => {
    const string = stringCount - note.string
    if (note.fret === null) return `x.${string}`

    const effects: string[] = []
    if (note.technique === 'h' || note.technique === 'p') effects.push('h')
    if (note.technique === '/' || note.technique === '\\') effects.push('sl')
    if (note.technique === '~') effects.push('v')
    if (note.bend > 0) {
        // alphaTex bends are written in quarter tones.
        effects.push(note.bendRelease ? `b (0 ${note.bend * 2} 0)` : `b (0 ${note.bend * 2})`)
    }
    return `${note.fret}.${string}${effects.length > 0 ? `{${effects.join(' ')}}` : ''}`
}

const beatText = (beat: NotatedBeat, stringCount: number): string => {
    const effects: string[] = []
    if (beat.value.dots > 0) effects.push('d')
    if (beat.value.triplet) effects.push('tu 3')
    const suffix = `.${beat.value.base}${effects.length > 0 ? `{${effects.join(' ')}}` : ''}`

    if (beat.notes.length === 0) return `r${suffix}`
    if (beat.notes.length === 1) return `${noteText(beat.notes[0], stringCount)}${suffix}`
    return `(${beat.notes.map((note) => noteText(note, stringCount)).join(' ')})${suffix}`
}

/**
 * Writes the tablature in alphaTex, the text format of alphaTab.
 * It is also the bridge used to produce Guitar Pro files.
 */
export function tablatureToAlphaTex(doc: TablatureDocument): string {
    const stringCount = doc.tuning.strings.length
    const header = [`\\title ${quote(doc.title)}`]
    if (doc.artist) header.push(`\\artist ${quote(doc.artist)}`)
    header.push(`\\tempo ${doc.bpm}`, '.')

    const staff = [
        `\\track ${quote(trackNameFor(doc))}`,
        '\\staff{tabs}',
        `\\instrument ${midiProgramFor(doc)}`,
        // alphaTex lists strings from the highest tab line to the lowest.
        `\\tuning ${[...doc.tuning.strings].reverse().map(midiToScientific).join(' ')}`,
    ]
    if (doc.capo > 0) staff.push(`\\capo ${doc.capo}`)

    let signature = ''
    const bars = collectTabEvents(doc.measures).map((events) => {
        const [numerator, denominator] = measureTimeSignature(events.columns, doc.quantization, doc.timeSignature)
        const current = `${numerator} ${denominator}`
        const prefix = current === signature ? '' : `\\ts ${current} `
        signature = current
        return prefix + measureToBeats(events, doc.quantization).map((beat) => beatText(beat, stringCount)).join(' ')
    })

    return `${header.join('\n')}\n${staff.join('\n')}\n${bars.join(' |\n')}\n`
}
