import type { TablatureDocument } from '@/types/tablature'
import { trackNameFor } from './alphaTex'
import {
    collectTabEvents,
    measureTimeSignature,
    measureToBeats,
    notePitch,
    TICKS_PER_QUARTER,
    type NotatedBeat,
    type TabNoteEvent,
} from './rhythm'

const STEPS: [string, number][] = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
]

const TYPE_NAMES: Record<number, string> = {
    1: 'whole', 2: 'half', 4: 'quarter', 8: 'eighth', 16: '16th', 32: '32nd', 64: '64th',
}

const escapeXml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pitchParts = (pitch: number): { step: string; alter: number; octave: number } => {
    const [step, alter] = STEPS[((pitch % 12) + 12) % 12]
    return { step, alter, octave: Math.floor(pitch / 12) - 1 }
}

const rhythmXml = (beat: NotatedBeat): string => {
    const parts = [`<duration>${beat.value.ticks}</duration>`, '<voice>1</voice>', `<type>${TYPE_NAMES[beat.value.base]}</type>`]
    if (beat.value.dots > 0) parts.push('<dot/>')
    if (beat.value.triplet) {
        parts.push('<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>')
    }
    return parts.join('')
}

/** Technique that must be closed on the next note of each string ("stop" element). */
type PendingLink = 'hammer-on' | 'pull-off' | 'slide'

const noteXml = (
    doc: TablatureDocument,
    beat: NotatedBeat,
    note: TabNoteEvent,
    isChordMember: boolean,
    pending: Map<number, PendingLink>
): string => {
    const stringCount = doc.tuning.strings.length
    const { step, alter, octave } = pitchParts(notePitch(doc.tuning.strings, doc.capo, note.string, note.fret ?? 0))
    const technical = [`<string>${stringCount - note.string}</string>`, `<fret>${note.fret ?? 0}</fret>`]
    const notations: string[] = []

    const closing = pending.get(note.string)
    pending.delete(note.string)
    if (closing === 'slide') notations.push('<slide type="stop"/>')
    else if (closing) technical.push(`<${closing} type="stop"/>`)

    if (note.fret !== null) {
        if (note.technique === 'h') {
            technical.push('<hammer-on type="start">H</hammer-on>')
            pending.set(note.string, 'hammer-on')
        } else if (note.technique === 'p') {
            technical.push('<pull-off type="start">P</pull-off>')
            pending.set(note.string, 'pull-off')
        } else if (note.technique === '/' || note.technique === '\\') {
            notations.push('<slide type="start" line-type="solid"/>')
            pending.set(note.string, 'slide')
        } else if (note.technique === '~') {
            notations.push('<ornaments><wavy-line type="start"/><wavy-line type="stop"/></ornaments>')
        }
        if (note.bend > 0) {
            technical.push(`<bend><bend-alter>${note.bend}</bend-alter>${note.bendRelease ? '<release/>' : ''}</bend>`)
        }
    }

    return [
        '<note>',
        isChordMember ? '<chord/>' : '',
        `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch>`,
        rhythmXml(beat),
        note.fret === null ? '<notehead>x</notehead>' : '',
        `<notations>${notations.join('')}<technical>${technical.join('')}</technical></notations>`,
        '</note>',
    ].join('')
}

/** Writes the tablature as an uncompressed MusicXML 4.0 score with a TAB staff. */
export function tablatureToMusicXml(doc: TablatureDocument): string {
    const stringCount = doc.tuning.strings.length
    const pending = new Map<number, PendingLink>()
    let signature = ''

    const measures = collectTabEvents(doc.measures).map((events, index) => {
        const [numerator, denominator] = measureTimeSignature(events.columns, doc.quantization, doc.timeSignature)
        const current = `${numerator}/${denominator}`
        const attributes: string[] = []

        if (index === 0) attributes.push(`<divisions>${TICKS_PER_QUARTER}</divisions>`, '<key><fifths>0</fifths></key>')
        if (current !== signature) {
            attributes.push(`<time><beats>${numerator}</beats><beat-type>${denominator}</beat-type></time>`)
            signature = current
        }
        if (index === 0) {
            const tunings = doc.tuning.strings.map((pitch, stringIndex) => {
                const { step, alter, octave } = pitchParts(pitch)
                return `<staff-tuning line="${stringIndex + 1}"><tuning-step>${step}</tuning-step>${
                    alter ? `<tuning-alter>${alter}</tuning-alter>` : ''
                }<tuning-octave>${octave}</tuning-octave></staff-tuning>`
            })
            attributes.push(
                '<clef><sign>TAB</sign><line>5</line></clef>',
                `<staff-details><staff-lines>${stringCount}</staff-lines>${tunings.join('')}${
                    doc.capo > 0 ? `<capo>${doc.capo}</capo>` : ''
                }</staff-details>`
            )
        }

        const measure = doc.measures[index]
        const content: string[] = []
        if (measure.repeatStart || measure.ending) {
            content.push(
                '<barline location="left">' +
                (measure.repeatStart ? '<bar-style>heavy-light</bar-style>' : '') +
                (measure.ending ? `<ending number="${measure.ending}" type="start">${measure.ending}.</ending>` : '') +
                (measure.repeatStart ? '<repeat direction="forward"/>' : '') +
                '</barline>'
            )
        }
        if (attributes.length > 0) content.push(`<attributes>${attributes.join('')}</attributes>`)
        if (index === 0) {
            content.push(
                '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit>' +
                `<per-minute>${doc.bpm}</per-minute></metronome></direction-type><sound tempo="${doc.bpm}"/></direction>`
            )
        }

        for (const beat of measureToBeats(events, doc.quantization)) {
            if (beat.notes.length === 0) {
                content.push(`<note><rest/>${rhythmXml(beat)}</note>`)
                continue
            }
            beat.notes.forEach((note, noteIndex) => content.push(noteXml(doc, beat, note, noteIndex > 0, pending)))
        }

        if (measure.repeatEnd || measure.ending) {
            content.push(
                '<barline location="right">' +
                (measure.repeatEnd ? '<bar-style>light-heavy</bar-style>' : '') +
                (measure.ending ? `<ending number="${measure.ending}" type="${measure.repeatEnd ? 'stop' : 'discontinue'}"/>` : '') +
                (measure.repeatEnd ? `<repeat direction="backward" times="${measure.repeatEnd}"/>` : '') +
                '</barline>'
            )
        }

        return `<measure number="${index + 1}">${content.join('')}</measure>`
    })

    return [
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
        '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
        '<score-partwise version="4.0">',
        `<work><work-title>${escapeXml(doc.title)}</work-title></work>`,
        '<identification>',
        doc.artist ? `<creator type="composer">${escapeXml(doc.artist)}</creator>` : '',
        '<encoding><software>Guitare Trainer</software></encoding>',
        '</identification>',
        `<part-list><score-part id="P1"><part-name>${escapeXml(trackNameFor(doc))}</part-name></score-part></part-list>`,
        '<part id="P1">',
        ...measures,
        '</part>',
        '</score-partwise>',
        '',
    ].filter((line, index, all) => line !== '' || index === all.length - 1).join('\n')
}
