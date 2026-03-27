/**
 * Performance Tests - Spacebar Response Time
 * Validates that chord changes respond within 100ms
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChordCycle } from '@/renderer/composables/useChordCycle'
import { nextTick } from 'vue'

describe('Spacebar Response Time (<100ms)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should change chord in less than 100ms', async () => {
    // Use the composable
    const result = useChordCycle()
    const currentChord = result.currentChord
    const nextChord = result.nextChord

    const startTime = performance.now()

    // Trigger chord change
    nextChord()
    await nextTick()

    const endTime = performance.now()
    const responseTime = endTime - startTime

    // Verify chord changed
    expect(currentChord.value).toBeDefined()
    expect(currentChord.value.name).toBeDefined()

    // Verify response time
    expect(responseTime).toBeLessThan(100)
  })

  it('should handle rapid spacebar presses without lag', async () => {
    const result = useChordCycle()
    const { nextChord } = result

    const responseTimes: number[] = []
    const iterations = 10

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      nextChord()
      await nextTick()
      const endTime = performance.now()
      responseTimes.push(endTime - startTime)
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    const maxResponseTime = Math.max(...responseTimes)

    expect(avgResponseTime).toBeLessThan(100)
    expect(maxResponseTime).toBeLessThan(100)
  })

  it('should complete chord data retrieval in <10ms', () => {
    const { currentChord } = useChordCycle()

    const startTime = performance.now()
    const chord = currentChord.value
    const endTime = performance.now()

    const retrievalTime = endTime - startTime

    expect(chord).toBeDefined()
    expect(chord.name).toBeDefined()
    expect(chord.frets).toHaveLength(6)
    expect(retrievalTime).toBeLessThan(10)
  })
})
