import type { TablatureDocument } from '@/types/tablature'
import type { ExportedFile } from './formats'
import { tablatureToPrintHtml } from './printLayout'

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
