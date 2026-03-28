import { ref, shallowRef, onUnmounted, watch } from 'vue'
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

export type AudioDetectionProfileId =
    | 'guitar-classical'
    | 'guitar-folk'
    | 'ukulele-soprano'
    | 'ukulele-concert'
    | 'ukulele-tenor'
    | 'custom'

export interface AudioDetectionProfile {
    id: AudioDetectionProfileId
    label: string
    instrument: Instrument
    rmsThreshold: number
    minFrequency: number
    maxFrequency: number
}

export interface AudioDetectionSettings {
    profileId: AudioDetectionProfileId
    rmsThreshold: number
    minFrequency: number
    maxFrequency: number
}

const STORAGE_KEY_AUDIO_DEVICE = 'listen-selected-device-id-v1'
const STORAGE_KEY_AUDIO_SETTINGS = 'listen-detection-settings-v1'

const DEFAULT_AUDIO_SETTINGS: AudioDetectionSettings = {
    profileId: 'guitar-folk',
    rmsThreshold: 0.002,
    minFrequency: 70,
    maxFrequency: 1500,
}

export const AUDIO_DETECTION_PROFILES: AudioDetectionProfile[] = [
    {
        id: 'guitar-classical',
        label: 'Guitar - Classical',
        instrument: 'guitar',
        rmsThreshold: 0.0018,
        minFrequency: 70,
        maxFrequency: 1300,
    },
    {
        id: 'guitar-folk',
        label: 'Guitar - Folk',
        instrument: 'guitar',
        rmsThreshold: 0.002,
        minFrequency: 70,
        maxFrequency: 1500,
    },
    {
        id: 'ukulele-soprano',
        label: 'Ukulele - Soprano',
        instrument: 'ukulele',
        rmsThreshold: 0.0017,
        minFrequency: 180,
        maxFrequency: 1800,
    },
    {
        id: 'ukulele-concert',
        label: 'Ukulele - Concert',
        instrument: 'ukulele',
        rmsThreshold: 0.0017,
        minFrequency: 160,
        maxFrequency: 1700,
    },
    {
        id: 'ukulele-tenor',
        label: 'Ukulele - Tenor',
        instrument: 'ukulele',
        rmsThreshold: 0.0018,
        minFrequency: 130,
        maxFrequency: 1650,
    },
]

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function getProfileById(profileId: AudioDetectionProfileId): AudioDetectionProfile | null {
    return AUDIO_DETECTION_PROFILES.find((p) => p.id === profileId) ?? null
}

function sanitizeDetectionSettings(input: Partial<AudioDetectionSettings>): AudioDetectionSettings {
    const rawProfile = input.profileId
    const profileId: AudioDetectionProfileId =
        rawProfile === 'guitar-classical' ||
            rawProfile === 'guitar-folk' ||
            rawProfile === 'ukulele-soprano' ||
            rawProfile === 'ukulele-concert' ||
            rawProfile === 'ukulele-tenor' ||
            rawProfile === 'custom'
            ? rawProfile
            : DEFAULT_AUDIO_SETTINGS.profileId

    const rmsThreshold = clamp(input.rmsThreshold ?? DEFAULT_AUDIO_SETTINGS.rmsThreshold, 0.0005, 0.02)
    const minFrequency = clamp(input.minFrequency ?? DEFAULT_AUDIO_SETTINGS.minFrequency, 20, 3000)
    const maxFrequency = clamp(input.maxFrequency ?? DEFAULT_AUDIO_SETTINGS.maxFrequency, 40, 4000)

    if (maxFrequency <= minFrequency + 10) {
        return {
            profileId,
            rmsThreshold,
            minFrequency,
            maxFrequency: minFrequency + 10,
        }
    }

    return {
        profileId,
        rmsThreshold,
        minFrequency,
        maxFrequency,
    }
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
    detectionProfileId: Ref<AudioDetectionProfileId>
    rmsThreshold: Ref<number>
    minFrequency: Ref<number>
    maxFrequency: Ref<number>
    detectionProfiles: ReadonlyArray<AudioDetectionProfile>
    applyDetectionProfile: (profileId: AudioDetectionProfileId) => void
    setRmsThreshold: (nextThreshold: number) => void
    setFrequencyRange: (minFrequency: number, maxFrequency: number) => void
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

    const detectionProfileId = ref<AudioDetectionProfileId>(DEFAULT_AUDIO_SETTINGS.profileId)
    const rmsThreshold = ref(DEFAULT_AUDIO_SETTINGS.rmsThreshold)
    const minFrequency = ref(DEFAULT_AUDIO_SETTINGS.minFrequency)
    const maxFrequency = ref(DEFAULT_AUDIO_SETTINGS.maxFrequency)

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

    function persistSettings(): void {
        const settings: AudioDetectionSettings = {
            profileId: detectionProfileId.value,
            rmsThreshold: rmsThreshold.value,
            minFrequency: minFrequency.value,
            maxFrequency: maxFrequency.value,
        }
        globalThis.localStorage.setItem(STORAGE_KEY_AUDIO_SETTINGS, JSON.stringify(settings))
    }

    function loadPersistedState(): void {
        const savedDeviceId = globalThis.localStorage.getItem(STORAGE_KEY_AUDIO_DEVICE)
        if (savedDeviceId) {
            selectedDeviceId.value = savedDeviceId
        }

        const rawSettings = globalThis.localStorage.getItem(STORAGE_KEY_AUDIO_SETTINGS)
        if (!rawSettings) return

        try {
            const parsed = JSON.parse(rawSettings) as Partial<AudioDetectionSettings>
            const normalized = sanitizeDetectionSettings(parsed)
            detectionProfileId.value = normalized.profileId
            rmsThreshold.value = normalized.rmsThreshold
            minFrequency.value = normalized.minFrequency
            maxFrequency.value = normalized.maxFrequency
        } catch (_e) {
            // Ignore invalid persisted values and use defaults.
        }
    }

    function applyDetectionProfile(profileId: AudioDetectionProfileId): void {
        if (profileId === 'custom') {
            detectionProfileId.value = 'custom'
            persistSettings()
            return
        }

        const profile = getProfileById(profileId)
        if (!profile) return

        detectionProfileId.value = profile.id
        rmsThreshold.value = profile.rmsThreshold
        minFrequency.value = profile.minFrequency
        maxFrequency.value = profile.maxFrequency
        persistSettings()
    }

    function setRmsThreshold(nextThreshold: number): void {
        if (!Number.isFinite(nextThreshold)) return
        rmsThreshold.value = clamp(nextThreshold, 0.0005, 0.02)
        detectionProfileId.value = 'custom'
        persistSettings()
    }

    function setFrequencyRange(nextMinFrequency: number, nextMaxFrequency: number): void {
        if (!Number.isFinite(nextMinFrequency) || !Number.isFinite(nextMaxFrequency)) return

        let normalizedMin = clamp(nextMinFrequency, 20, 3000)
        let normalizedMax = clamp(nextMaxFrequency, 40, 4000)

        if (normalizedMax <= normalizedMin + 10) {
            normalizedMax = normalizedMin + 10
        }

        if (normalizedMax > 4000) {
            normalizedMax = 4000
            normalizedMin = Math.min(normalizedMin, normalizedMax - 10)
        }

        minFrequency.value = normalizedMin
        maxFrequency.value = normalizedMax
        detectionProfileId.value = 'custom'
        persistSettings()
    }

    loadPersistedState()

    watch(selectedDeviceId, (deviceId) => {
        if (!deviceId) return
        globalThis.localStorage.setItem(STORAGE_KEY_AUDIO_DEVICE, deviceId)
    })

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
        loadPersistedState()

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
        if (rms > rmsThreshold.value) {
            const frequencies = detectPitchesFromFFT(frequencyData, sampleRate, fftSize, {
                minFrequency: minFrequency.value,
                maxFrequency: maxFrequency.value,
            })

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
        detectionProfileId,
        rmsThreshold,
        minFrequency,
        maxFrequency,
        detectionProfiles: AUDIO_DETECTION_PROFILES,
        applyDetectionProfile,
        setRmsThreshold,
        setFrequencyRange,
        start,
        stop,
        refreshDevices,
    }
}
