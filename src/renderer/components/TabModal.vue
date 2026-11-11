<template>
  <Teleport to="body">
    <transition name="tab-modal-fade">
      <div v-if="modelValue" class="tab-modal" role="dialog" aria-modal="true" :aria-labelledby="titleId"
        @mousedown.self="close" @keydown="onKeydown">
        <div ref="panel" class="tab-modal__panel" :class="`tab-modal__panel--${size}`" tabindex="-1">
          <header class="tab-modal__header">
            <h2 :id="titleId" class="tab-modal__title">
              {{ title }}
            </h2>
            <button class="tab-btn tab-btn--icon tab-btn--ghost" type="button" aria-label="Close" @click="close">
              ×
            </button>
          </header>
          <div class="tab-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="tab-modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  size?: 'small' | 'medium' | 'large'
}>(), {
  size: 'medium',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

let nextId = 0
const titleId = `tab-modal-title-${++nextId}-${Math.random().toString(36).slice(2, 7)}`
const panel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const close = (): void => {
  emit('update:modelValue', false)
}

const focusables = (): HTMLElement[] => Array.from(panel.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }

  // Keep keyboard focus inside the dialog.
  if (event.key === 'Tab') {
    const items = focusables()
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = globalThis.document.activeElement
    if (event.shiftKey && (active === first || active === panel.value)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

/** Escape must also work when focus fell back to the page (a focused button got disabled). */
const onWindowKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  if (panel.value?.contains(globalThis.document.activeElement)) return
  event.preventDefault()
  close()
}

onUnmounted(() => globalThis.window.removeEventListener('keydown', onWindowKeydown))

watch(() => props.modelValue, async (open) => {
  globalThis.window.removeEventListener('keydown', onWindowKeydown)
  if (open) {
    globalThis.window.addEventListener('keydown', onWindowKeydown)
    previouslyFocused = globalThis.document.activeElement as HTMLElement | null
    await nextTick()
    const preferred = panel.value?.querySelector<HTMLElement>('[data-autofocus]')
    ;(preferred ?? panel.value)?.focus()
  } else {
    previouslyFocused?.focus?.()
    previouslyFocused = null
  }
}, { immediate: true })
</script>
