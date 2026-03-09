<template>
  <transition name="fade">
    <div 
      v-if="isVisible" 
      class="keyboard-help"
      role="dialog"
      aria-labelledby="keyboard-help-title"
      aria-modal="true"
    >
      <div class="keyboard-help__content">
        <h2 id="keyboard-help-title" class="keyboard-help__title">
          Keyboard Shortcuts
        </h2>
        
        <dl class="keyboard-help__list">
          <div class="keyboard-help__item">
            <dt class="keyboard-help__key">
              <kbd>SPACE</kbd>
            </dt>
            <dd class="keyboard-help__description">
              Next random chord
            </dd>
          </div>
          
          <div class="keyboard-help__item">
            <dt class="keyboard-help__key">
              <kbd>←</kbd> / <kbd>BKSP</kbd>
            </dt>
            <dd class="keyboard-help__description">
              Previous chord
            </dd>
          </div>
          
          <div class="keyboard-help__item">
            <dt class="keyboard-help__key">
              <kbd>M</kbd>
            </dt>
            <dd class="keyboard-help__description">
              Toggle memory training mode
            </dd>
          </div>
          
          <div class="keyboard-help__item">
            <dt class="keyboard-help__key">
              <kbd>L</kbd>
            </dt>
            <dd class="keyboard-help__description">
              Show chord library
            </dd>
          </div>
          
          <div class="keyboard-help__item">
            <dt class="keyboard-help__key">
              <kbd>⌘</kbd> + <kbd>F</kbd> / <kbd>Ctrl</kbd> + <kbd>F</kbd>
            </dt>
            <dd class="keyboard-help__description">
              Toggle fullscreen
            </dd>
          </div>
          
          <div class="keyboard-help__item">
            <dt class="keyboard-help__key">
              <kbd>?</kbd>
            </dt>
            <dd class="keyboard-help__description">
              Show/hide this help
            </dd>
          </div>
        </dl>
        
        <p class="keyboard-help__footer">
          Press <kbd>?</kbd> or <kbd>ESC</kbd> to close
        </p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isVisible = ref(false)

const toggleHelp = () => {
  isVisible.value = !isVisible.value
}

const handleKeyPress = (event: KeyboardEvent) => {
  // Toggle help with "?" key
  if (event.key === '?' && !event.shiftKey) {
    event.preventDefault()
    toggleHelp()
  }
  
  // Close help with Escape key
  if (event.key === 'Escape' && isVisible.value) {
    event.preventDefault()
    isVisible.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.keyboard-help {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.keyboard-help__content {
  background: var(--bg-secondary);
  border: 2px solid var(--accent-primary);
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.keyboard-help__title {
  color: var(--accent-primary);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.keyboard-help__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.keyboard-help__item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--text-secondary);
}

.keyboard-help__item:last-child {
  border-bottom: none;
}

.keyboard-help__key {
  min-width: 180px;
  font-weight: 600;
  color: var(--text-primary);
}

.keyboard-help__key kbd {
  display: inline-block;
  background: var(--bg-primary);
  border: 2px solid var(--accent-primary);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--accent-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.keyboard-help__description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.keyboard-help__footer {
  margin: 1.5rem 0 0 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.keyboard-help__footer kbd {
  display: inline-block;
  background: var(--bg-primary);
  border: 1px solid var(--text-secondary);
  border-radius: 3px;
  padding: 0.2rem 0.4rem;
  font-family: monospace;
  font-size: 0.75rem;
  margin: 0 0.2rem;
}

/* Transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .keyboard-help__content {
    border-width: 3px;
  }
  
  .keyboard-help__key kbd {
    border-width: 3px;
  }
}

/* Responsive */
@media (max-width: 600px) {
  .keyboard-help__content {
    padding: 1.5rem;
  }
  
  .keyboard-help__item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .keyboard-help__key {
    min-width: auto;
  }
}
</style>
