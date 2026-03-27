<template>
	<div
		class="settings-menu"
		role="region"
		aria-label="Settings"
	>
		<button
			class="settings-menu__toggle"
			:aria-expanded="isOpen"
			aria-controls="settings-panel"
			title="Settings"
			@click="isOpen = !isOpen"
		>
			<span aria-hidden="true">⚙</span>
			<span class="sr-only">Settings</span>
		</button>

		<div
			v-if="isOpen"
			id="settings-panel"
			class="settings-menu__panel glass-panel"
			role="dialog"
			aria-label="Settings"
		>
			<h2 class="settings-menu__title">Settings</h2>

			<div class="settings-menu__group">
				<span id="theme-label" class="settings-menu__label">Theme</span>
				<div
					class="settings-menu__row"
					role="radiogroup"
					aria-labelledby="theme-label"
				>
					<button
						class="settings-menu__chip"
						:class="{ 'settings-menu__chip--active': theme === 'dark' }"
						role="radio"
						:aria-checked="theme === 'dark'"
						@click="setTheme('dark')"
					>
						🌙 Dark
					</button>
					<button
						class="settings-menu__chip"
						:class="{ 'settings-menu__chip--active': theme === 'light' }"
						role="radio"
						:aria-checked="theme === 'light'"
						@click="setTheme('light')"
					>
						☀ Light
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

type Theme = 'dark' | 'light'

const STORAGE_KEY_THEME = 'a11y-theme'

const isOpen = ref(false)
const theme = ref<Theme>('dark')

const setTheme = (nextTheme: Theme): void => {
	theme.value = nextTheme
	globalThis.document.documentElement.setAttribute('data-theme', nextTheme)
	globalThis.localStorage.setItem(STORAGE_KEY_THEME, nextTheme)
}

const handleClickOutside = (e: globalThis.MouseEvent): void => {
	const el = (e.target as globalThis.HTMLElement).closest('.settings-menu')
	if (!el) {
		isOpen.value = false
	}
}

const handleEscape = (e: globalThis.KeyboardEvent): void => {
	if (e.key === 'Escape') {
		isOpen.value = false
	}
}

onMounted(() => {
	const savedTheme = globalThis.localStorage.getItem(STORAGE_KEY_THEME) as Theme | null
	if (savedTheme === 'dark' || savedTheme === 'light') {
		setTheme(savedTheme)
	}

	globalThis.document.addEventListener('click', handleClickOutside)
	globalThis.document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
	globalThis.document.removeEventListener('click', handleClickOutside)
	globalThis.document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.settings-menu {
	position: relative;
}

.settings-menu__toggle {
	width: 36px;
	height: 36px;
	border-radius: var(--glass-radius-sm);
	border: 1px solid var(--glass-border);
	background: rgba(255, 255, 255, 0.06);
	backdrop-filter: blur(8px);
	-webkit-backdrop-filter: blur(8px);
	color: var(--text-primary);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background 0.2s, border-color 0.2s;
}

.settings-menu__toggle > span[aria-hidden] {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.4rem;
	height: 100%;
	width: 100%;
	line-height: 1;
}

.settings-menu__toggle:hover {
	background: var(--accent-primary);
	border-color: var(--accent-primary);
}

.settings-menu__panel {
	position: absolute;
	top: calc(100% + 12px);
	right: 0;
	width: 260px;
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 0.85rem;
}

.settings-menu__title {
	font-size: 0.85rem;
	font-weight: 700;
	color: var(--text-primary);
	letter-spacing: 0.03em;
	text-transform: uppercase;
}

.settings-menu__group {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.settings-menu__label {
	font-size: 0.75rem;
	font-weight: 600;
	color: var(--text-secondary);
}

.settings-menu__row {
	display: flex;
	align-items: center;
	gap: 0.4rem;
}

.settings-menu__chip {
	flex: 1;
	padding: 0.35rem 0.5rem;
	border-radius: var(--glass-radius-sm);
	border: 1px solid var(--glass-border);
	background: transparent;
	color: var(--text-primary);
	font-size: 0.8rem;
	cursor: pointer;
	text-align: center;
	transition: background 0.15s, border-color 0.15s;
}

.settings-menu__chip:hover {
	background: var(--glass-bg-hover);
}

.settings-menu__chip--active {
	background: var(--accent-primary);
	color: #fff;
	border-color: var(--accent-primary);
}
</style>