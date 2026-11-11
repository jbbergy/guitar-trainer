<template>
  <TabModal :model-value="modelValue" title="Tablature library" size="large" @update:model-value="emit('update:modelValue', $event)">
    <div class="tab-library__create">
      <label class="tab-label" for="tab-library-new-tuning">New tablature for</label>
      <TabTuningSelect id="tab-library-new-tuning" v-model="newTuningId" />
      <button class="tab-btn tab-btn--primary" type="button" data-testid="library-create" @click="create">
        ＋ Create
      </button>
      <span class="tab-library__spacer" />
      <button class="tab-btn" type="button" data-testid="library-import" @click="emit('import')">
        ⇩ Import…
      </button>
      <button class="tab-btn" type="button" :disabled="entries.length === 0" title="Save every tablature in one JSON file"
        @click="emit('backup')">
        Backup all
      </button>
    </div>

    <div class="tab-library__filters">
      <input v-model="search" class="tab-input tab-library__search" type="search" placeholder="Search a title or an artist…"
        aria-label="Search the library" data-autofocus>
      <div class="tab-library__families" role="group" aria-label="Filter by instrument">
        <button v-for="option in FAMILY_FILTERS" :key="option.value" class="tab-btn" type="button"
          :class="{ 'tab-btn--active': family === option.value }" :aria-pressed="family === option.value"
          @click="family = option.value">
          {{ option.label }}
        </button>
      </div>
      <select v-model="sort" class="tab-select" aria-label="Sort tablatures">
        <option value="recent">
          Recently edited
        </option>
        <option value="title">
          Title A–Z
        </option>
        <option value="artist">
          Artist A–Z
        </option>
      </select>
    </div>

    <p v-if="entries.length === 0" class="tab-help tab-library__empty">
      The library is empty. Create a tablature or import one (text tab, Guitar Pro, MusicXML…).
    </p>
    <p v-else-if="visible.length === 0" class="tab-help tab-library__empty">
      No tablature matches this search.
    </p>

    <ul v-else class="tab-library__list" aria-label="Tablatures">
      <li v-for="entry in visible" :key="entry.id" class="tab-library__item"
        :class="{ 'tab-library__item--current': entry.id === currentId }" data-testid="library-item">
        <button class="tab-library__open" type="button" :aria-label="`Open ${entry.title || 'Untitled tablature'}`"
          @click="emit('open', entry.id)">
          <span class="tab-library__title">{{ entry.title || 'Untitled tablature' }}</span>
          <span class="tab-library__meta">
            <span v-if="entry.artist">{{ entry.artist }} · </span>{{ entry.tuningName }} · {{ entry.measureCount }}
            {{ entry.measureCount === 1 ? 'measure' : 'measures' }} · {{ formatDate(entry.updatedAt) }}
          </span>
        </button>
        <span v-if="entry.id === currentId" class="tab-chip">Open</span>

        <div v-if="confirmingDelete === entry.id" class="tab-library__actions" role="group" aria-label="Confirm deletion">
          <span class="tab-error">Delete for good?</span>
          <button class="tab-btn tab-btn--danger" type="button" data-testid="library-confirm-delete" @click="confirmDelete(entry.id)">
            Delete
          </button>
          <button class="tab-btn" type="button" @click="confirmingDelete = null">
            Keep
          </button>
        </div>
        <div v-else class="tab-library__actions">
          <button class="tab-btn" type="button" title="Rewrite for another instrument or tuning" @click="emit('convert', entry.id)">
            ⇄ Convert
          </button>
          <button class="tab-btn" type="button" title="Export to a file" @click="emit('export', entry.id)">
            ⇧ Export
          </button>
          <button class="tab-btn tab-btn--icon" type="button" title="Duplicate" :aria-label="`Duplicate ${entry.title}`"
            @click="emit('duplicate', entry.id)">
            ⧉
          </button>
          <button class="tab-btn tab-btn--icon tab-btn--danger" type="button" title="Delete"
            :aria-label="`Delete ${entry.title}`" data-testid="library-delete" @click="confirmingDelete = entry.id">
            🗑
          </button>
        </div>
      </li>
    </ul>

    <template #footer>
      <span class="tab-modal__footer-note">
        {{ entries.length }} {{ entries.length === 1 ? 'tablature' : 'tablatures' }} stored on this device · changes are saved automatically
      </span>
      <button class="tab-btn" type="button" @click="emit('update:modelValue', false)">
        Close
      </button>
    </template>
  </TabModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TabInstrumentFamily } from '@/types/tablature'
import type { TabLibraryEntry } from '@/utils/tab/library'
import TabModal from './TabModal.vue'
import TabTuningSelect from './TabTuningSelect.vue'

type FamilyFilter = 'all' | TabInstrumentFamily

const FAMILY_FILTERS: { value: FamilyFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'guitar', label: 'Guitar' },
  { value: 'ukulele', label: 'Ukulele' },
  { value: 'other', label: 'Other' },
]

const props = defineProps<{
  modelValue: boolean
  entries: TabLibraryEntry[]
  currentId: string | null
  /** Tuning preselected for a new tablature */
  defaultTuningId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: [id: string]
  create: [tuningId: string]
  duplicate: [id: string]
  delete: [id: string]
  convert: [id: string]
  export: [id: string]
  import: []
  backup: []
}>()

const search = ref('')
const family = ref<FamilyFilter>('all')
const sort = ref<'recent' | 'title' | 'artist'>('recent')
const newTuningId = ref(props.defaultTuningId)
const confirmingDelete = ref<string | null>(null)

watch(() => props.modelValue, (open) => {
  if (open) {
    newTuningId.value = props.defaultTuningId
    confirmingDelete.value = null
  }
})

const visible = computed(() => {
  const query = search.value.trim().toLowerCase()
  const filtered = props.entries.filter((entry) => {
    const inFamily =
      family.value === 'all' ||
      (family.value === 'other' ? entry.family !== 'guitar' && entry.family !== 'ukulele' : entry.family === family.value)
    const matches = query === '' || `${entry.title} ${entry.artist} ${entry.tuningName}`.toLowerCase().includes(query)
    return inFamily && matches
  })

  const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })
  return [...filtered].sort((a, b) => {
    if (sort.value === 'title') return byText(a.title, b.title)
    if (sort.value === 'artist') return byText(a.artist, b.artist) || byText(a.title, b.title)
    return b.updatedAt - a.updatedAt
  })
})

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

const create = (): void => {
  emit('create', newTuningId.value)
}

const confirmDelete = (id: string): void => {
  confirmingDelete.value = null
  emit('delete', id)
}
</script>

<style scoped>
.tab-library__create,
.tab-library__filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-library__spacer {
  flex: 1;
}

.tab-library__search {
  flex: 1;
  min-width: 180px;
}

.tab-library__families {
  display: flex;
  gap: 0.25rem;
}

.tab-library__empty {
  padding: 2rem 0;
  text-align: center;
}

.tab-library__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-height: 120px;
}

.tab-library__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.45rem 0.6rem;
  border-radius: var(--glass-radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
}

.tab-library__item--current {
  border-color: var(--accent-primary);
}

.tab-library__open {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  padding: 0.15rem 0.25rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tab-library__open:hover .tab-library__title {
  color: var(--accent-primary);
}

.tab-library__title {
  font-size: 0.95rem;
  font-weight: 700;
}

.tab-library__meta {
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.tab-library__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
</style>
