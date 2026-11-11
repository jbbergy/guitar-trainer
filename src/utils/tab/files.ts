import type { TablatureDocument } from '@/types/tablature'
import { tablatureToAscii } from './asciiExport'
import type { ExportedFile } from './formats'

/**
 * Hands a generated file to the user. In Electron this opens the native "Save as"
 * dialog; in a browser the file goes to the downloads folder.
 */
export function saveFile(file: ExportedFile): void {
    // Copy into a plain ArrayBuffer-backed view so the Blob constructor accepts it everywhere.
    const part: BlobPart = typeof file.data === 'string' ? file.data : new Uint8Array(file.data).buffer
    const blob = new Blob([part], { type: file.mimeType })
    const url = URL.createObjectURL(blob)
    const link = globalThis.document.createElement('a')
    link.href = url
    link.download = file.fileName
    link.rel = 'noopener'
    globalThis.document.body.appendChild(link)
    link.click()
    link.remove()
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function copyText(text: string): Promise<boolean> {
    try {
        if (!globalThis.navigator?.clipboard?.writeText) return false
        await globalThis.navigator.clipboard.writeText(text)
        return true
    } catch (error) {
        console.warn('Clipboard write failed:', error)
        return false
    }
}

const escapeHtml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Printable page: title block followed by the text tablature in a fixed-width font. */
export function tablatureToPrintHtml(doc: TablatureDocument): string {
    const details = [doc.tuning.name, doc.capo > 0 ? `Capo ${doc.capo}` : '', `${doc.bpm} BPM`].filter(Boolean).join(' · ')
    const body = tablatureToAscii(doc, { includeHeader: false, lineWidth: 86 })

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { margin: 16mm 14mm; }
  body { margin: 0; color: #000; background: #fff; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { margin: 0 0 2px; font-size: 20pt; }
  .artist { margin: 0 0 2px; font-size: 12pt; }
  .details { margin: 0 0 14px; font-size: 9.5pt; color: #444; }
  pre { margin: 0; font-family: Menlo, Consolas, "Courier New", monospace; font-size: 9.5pt; line-height: 1.25; white-space: pre; }
</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}</h1>
${doc.artist ? `<p class="artist">${escapeHtml(doc.artist)}</p>` : ''}
<p class="details">${escapeHtml(details)}</p>
<pre>${escapeHtml(body)}</pre>
</body>
</html>`
}

/**
 * Opens the system print dialog for a tablature (which also offers "Save as PDF").
 * The page is rendered in a hidden frame so the app itself is not printed.
 */
export function printTablature(doc: TablatureDocument): void {
    const frame = globalThis.document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.onload = () => {
        const target = frame.contentWindow
        if (!target) return
        target.focus()
        target.print()
        globalThis.setTimeout(() => frame.remove(), 60_000)
    }
    frame.srcdoc = tablatureToPrintHtml(doc)
    globalThis.document.body.appendChild(frame)
}
