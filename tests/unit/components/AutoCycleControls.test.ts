import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AutoCycleControls from '@/renderer/components/AutoCycleControls.vue'

describe('AutoCycleControls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Toggle Button', () => {
    it('renders with play icon when disabled', () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: false,
          bpm: 60
        }
      })

      const toggleButton = wrapper.find('.auto-cycle-controls__toggle')
      expect(toggleButton.exists()).toBe(true)
      expect(toggleButton.text()).toContain('▶')
      expect(toggleButton.text()).toContain('Auto')
    })

    it('renders with pause icon when enabled', () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: true,
          bpm: 60
        }
      })

      const toggleButton = wrapper.find('.auto-cycle-controls__toggle')
      expect(toggleButton.text()).toContain('⏸')
      expect(toggleButton.text()).toContain('Stop')
    })

    it('emits toggle event when clicked', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: false,
          bpm: 60
        }
      })

      const toggleButton = wrapper.find('.auto-cycle-controls__toggle')
      await toggleButton.trigger('click')

      expect(wrapper.emitted('toggle')).toBeTruthy()
      expect(wrapper.emitted('toggle')?.length).toBe(1)
    })

    it('applies active class when enabled', () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: true,
          bpm: 60
        }
      })

      const toggleButton = wrapper.find('.auto-cycle-controls__toggle')
      expect(toggleButton.classes()).toContain('auto-cycle-controls__toggle--active')
    })
  })

  describe('BPM Controls', () => {
    it('displays current BPM value', () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: false,
          bpm: 120
        }
      })

      const input = wrapper.find('.auto-cycle-controls__bpm-input') as any
      expect(input.element.value).toBe(120)
    })

    it('increments BPM by 5 when + button clicked', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: true,
          bpm: 60
        }
      })

      const buttons = wrapper.findAll('.auto-cycle-controls__bpm-button')
      const incrementButton = buttons[1] // Second button is increment
      await incrementButton.trigger('click')

      expect(wrapper.emitted('updateBpm')).toBeTruthy()
      expect(wrapper.emitted('updateBpm')?.[0]).toEqual([65])
    })

    it('decrements BPM by 5 when - button clicked', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: true,
          bpm: 60
        }
      })

      const buttons = wrapper.findAll('.auto-cycle-controls__bpm-button')
      const decrementButton = buttons[0] // First button is decrement
      await decrementButton.trigger('click')

      expect(wrapper.emitted('updateBpm')).toBeTruthy()
      expect(wrapper.emitted('updateBpm')?.[0]).toEqual([55])
    })

    it('does not decrement below 20 BPM', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: true,
          bpm: 20
        }
      })

      const buttons = wrapper.findAll('.auto-cycle-controls__bpm-button')
      const decrementButton = buttons[0]

      expect(decrementButton.attributes('disabled')).toBeDefined()
      await decrementButton.trigger('click')

      expect(wrapper.emitted('updateBpm')).toBeFalsy()
    })

    it('does not increment above 240 BPM', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: true,
          bpm: 240
        }
      })

      const buttons = wrapper.findAll('.auto-cycle-controls__bpm-button')
      const incrementButton = buttons[1]

      expect(incrementButton.attributes('disabled')).toBeDefined()
      await incrementButton.trigger('click')

      expect(wrapper.emitted('updateBpm')).toBeFalsy()
    })

    it('emits updateBpm event when input value changes', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: true,
          bpm: 60
        }
      })

      const input = wrapper.find('.auto-cycle-controls__bpm-input')
      await input.setValue('90')
      await input.trigger('change')

      expect(wrapper.emitted('updateBpm')).toBeTruthy()
      expect(wrapper.emitted('updateBpm')?.[0]).toEqual([90])
    })

    it('clamps invalid BPM input to valid range on change', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: true,
          bpm: 60
        }
      })

      const input = wrapper.find('.auto-cycle-controls__bpm-input')

      // Test too high - emits original value on input, then clamped value on change
      await input.setValue('300')
      await input.trigger('input')
      await input.trigger('change')

      const events = wrapper.emitted('updateBpm')
      expect(events).toBeTruthy()
      // The last event should be the clamped value
      const lastEvent = events?.[events.length - 1]
      expect(lastEvent).toEqual([240])

      // Test too low
      await input.setValue('10')
      await input.trigger('input')
      await input.trigger('change')

      const events2 = wrapper.emitted('updateBpm')
      const lastEvent2 = events2?.[events2.length - 1]
      expect(lastEvent2).toEqual([20])
    })

    it('shows disabled state when auto-cycle is not enabled', () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: false,
          bpm: 60
        }
      })

      const bpmSection = wrapper.find('.auto-cycle-controls__bpm')
      expect(bpmSection.classes()).toContain('auto-cycle-controls__bpm--disabled')
    })
  })

  describe('Difficulty Controls', () => {
    it('shows all levels in the difficulty dropdown', () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: false,
          bpm: 60,
          difficultyLevel: 'advanced'
        }
      })

      const options = wrapper.findAll('.auto-cycle-controls__difficulty-select option')
      const values = options.map(option => option.attributes('value'))

      expect(values).toEqual(['beginner', 'intermediate', 'advanced'])
    })

    it('emits updateDifficulty when selected value changes', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: false,
          bpm: 60,
          difficultyLevel: 'advanced'
        }
      })

      const select = wrapper.find('.auto-cycle-controls__difficulty-select')
      await select.setValue('advanced')

      expect(wrapper.emitted('updateDifficulty')).toBeTruthy()
      expect(wrapper.emitted('updateDifficulty')?.[0]).toEqual(['advanced'])
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: false,
          bpm: 60
        }
      })

      expect(wrapper.attributes('aria-label')).toBe('Auto-cycle controls')

      const toggleButton = wrapper.find('.auto-cycle-controls__toggle')
      expect(toggleButton.attributes('aria-pressed')).toBe('false')

      const input = wrapper.find('.auto-cycle-controls__bpm-input')
      expect(input.attributes('aria-label')).toBe('Beats per minute')
    })

    it('updates aria-pressed when enabled state changes', async () => {
      const wrapper = mount(AutoCycleControls, {
        props: {
          isEnabled: false,
          bpm: 60
        }
      })

      let toggleButton = wrapper.find('.auto-cycle-controls__toggle')
      expect(toggleButton.attributes('aria-pressed')).toBe('false')

      await wrapper.setProps({ isEnabled: true })

      toggleButton = wrapper.find('.auto-cycle-controls__toggle')
      expect(toggleButton.attributes('aria-pressed')).toBe('true')
    })
  })
})
