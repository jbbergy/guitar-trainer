import { ref, shallowRef, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { PitchClass } from '@/utils/music/pitchClass'
import type { DetectedChord } from '@/utils/music/chordDetection'
import type { Instrument } from '@/types/chord'
import { detectPitchesFromFFT, frequencyToPitchClass, detectChordFromPitchClasses, computeRMS } from '@/utils/music/chordDetection'
import { pitchClassToNoteName } from '@/utils/music/pitchClass'

export interface AudioDevice {
    deviceId: string
    label: string
}

export interface UseAudioChordDetection {
    isListening: Ref<boolean>
    detectedChord: Ref<DetectedChord | null>
    detectedNotes: Ref<string[]>
    availableDevices: Ref<AudioDevice[]>
    selectedDeviceId: Ref<string>
    error: Ref<string | null>
    signalLevel: Ref<number>
    instrument: Ref<Instrument>
    start: () => Promise<void>
    stop: () => void
    refreshDevices: () => Promise<void>
}

export function useAudioChordDetection(
    instrumentRef: Ref<Instrument>
): UseAudioChordDetection {
    const isListening = ref(false)
    const detectedChord = ref<DetectedChord | null>(null)
    const detectedNotes = ref<string[]>([])
    const availableDevices = ref<AudioDevice[]>([])
    const selectedDeviceId = ref<string>('')
    const error = ref<string | null>(null)
    const signalLevel = ref(0)

    const audioContextRef = shallowRef<AudioContext | null>(null)
    const streamRef = shallowRef<MediaStream | null>(null)
    const analyserRef = shallowRef<AnalyserNode | null>(null)
    let animationFrameId: number | null = null

    // Sliding window: accumulate pitch classes over multiple frames
    const recentPitchClasses: Map<PitchClass, number> = new Map()
    const DECAY_MS = 600

    // Pre-allocated buffers (created once at start, reused every frame)
    let timeBuffer: Float32Array<ArrayBuffer> | null = null
    let frequencyBuffer: Float32Array<ArrayBuffer> | null = null
    let frameSkip = false

    async function refreshDevices(): Promise<void> {
        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            tempStream.getTracks().forEach((t) => t.stop())

            const devices = await navigator.mediaDevices.enumerateDevices()
            availableDevices.value = devices
                .filter((d) => d.kind === 'audioinput')
                .map((d) => ({
                    deviceId: d.deviceId,
                    label: d.label || `Microphone (${d.deviceId.slice(0, 8)}…)`,
                }))

            if (
                availableDevices.value.length > 0 &&
                !availableDevices.value.some((d) => d.deviceId === selectedDeviceId.value)
            ) {
                selectedDeviceId.value = availableDevices.value[0].deviceId
            }
        } catch (_e) {
            error.value = 'Microphone access denied. Please allow microphone access in your system settings.'
        }
    }

    function cleanup(): void {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
        }
        if (streamRef.value) {
            streamRef.value.getTracks().forEach((t) => t.stop())
            streamRef.value = null
        }
        if (audioContextRef.value) {
            audioContextRef.value.close()
            audioContextRef.value = null
        }
        analyserRef.value = null
        recentPitchClasses.clear()
    }

    async function start(): Promise<void> {
        error.value = null

        try {
            const constraints: MediaStreamConstraints = {
                audio: selectedDeviceId.value
                    ? {
                        deviceId: { exact: selectedDeviceId.value },
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    }
                    : {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    },
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.value = stream

            // Now that we have permission, populate available devices
            const devices = await navigator.mediaDevices.enumerateDevices()
            availableDevices.value = devices
                .filter((d) => d.kind === 'audioinput')
                .map((d) => ({
                    deviceId: d.deviceId,
                    label: d.label || `Microphone (${d.deviceId.slice(0, 8)}…)`,
                }))

            const audioContext = new AudioContext()
            audioContextRef.value = audioContext

            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 4096 // Good balance of resolution (~10.8 Hz/bin) and speed
            analyser.smoothingTimeConstant = 0.3
            source.connect(analyser)
            analyserRef.value = analyser

            isListening.value = true
            processAudio()
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
                error.value = 'Microphone access denied. Please allow microphone access.'
            } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
                error.value = 'No microphone found. Please connect a microphone.'
            } else {
                error.value = `Audio error: ${msg}`
            }
        }
    }

    function stop(): void {
        isListening.value = false
        cleanup()
        detectedChord.value = null
        detectedNotes.value = []
        signalLevel.value = 0
    }

    function processAudio(): void {
        if (!isListening.value || !analyserRef.value || !audioContextRef.value) return

        // Skip every other frame to reduce CPU (~30 fps is plenty for chord detection)
        frameSkip = !frameSkip
        if (frameSkip) {
            animationFrameId = requestAnimationFrame(processAudio)
            return
        }

        const analyser = analyserRef.value
        const sampleRate = audioContextRef.value.sampleRate
        const fftSize = analyser.fftSize

        // Allocate buffers once and reuse
        if (!timeBuffer || timeBuffer.length !== fftSize) {
            timeBuffer = new Float32Array(fftSize)
        }
        if (!frequencyBuffer || frequencyBuffer.length !== analyser.frequencyBinCount) {
            frequencyBuffer = new Float32Array(analyser.frequencyBinCount)
        }

        // Get time-domain data for RMS (signal level)
        analyser.getFloatTimeDomainData(timeBuffer)
        const rms = computeRMS(timeBuffer)
        signalLevel.value = Math.min(100, Math.round(rms * 500))

        // Get frequency-domain data for multi-pitch detection
        analyser.getFloatFrequencyData(frequencyBuffer)
        const frequencyData = frequencyBuffer

        const now = Date.now()

        // Only process if there's enough signal
        if (rms > 0.002) {
            const frequencies = detectPitchesFromFFT(frequencyData, sampleRate, fftSize)

            for (const freq of frequencies) {
                const pc = frequencyToPitchClass(freq)
                recentPitchClasses.set(pc, now)
            }
        }

        // Decay old entries
        for (const [pc, timestamp] of recentPitchClasses) {
            if (now - timestamp > DECAY_MS) {
                recentPitchClasses.delete(pc)
            }
        }

        // Use all recent pitch classes for chord detection
        const allRecentPCs = new Set<PitchClass>(recentPitchClasses.keys())

        const chord = detectChordFromPitchClasses(allRecentPCs, instrumentRef.value)
        detectedChord.value = chord

        // Update visible note names
        const noteNames: string[] = []
        for (const pc of allRecentPCs) {
            noteNames.push(pitchClassToNoteName(pc))
        }
        detectedNotes.value = noteNames

        animationFrameId = requestAnimationFrame(processAudio)
    }

    onUnmounted(() => {
        stop()
    })

    return {
        isListening,
        detectedChord,
        detectedNotes,
        availableDevices,
        selectedDeviceId,
        error,
        signalLevel,
        instrument: instrumentRef,
        start,
        stop,
        refreshDevices,
    }
}
