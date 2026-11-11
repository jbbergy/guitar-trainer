<template>
  <select class="tab-select" :value="modelValue" @change="onChange">
    <option v-if="customLabel" value="custom">
      {{ customLabel }}
    </option>
    <optgroup v-for="group in groups" :key="group.label" :label="group.label">
      <option v-for="tuning in group.tunings" :key="tuning.id" :value="tuning.id">
        {{ tuning.name }}
      </option>
    </optgroup>
  </select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TabInstrumentFamily } from '@/types/tablature'
import { TAB_TUNINGS } from '@/utils/tab/tunings'

const props = defineProps<{
  modelValue: string
  /** Only offer tunings with this number of strings */
  stringCount?: number
  /** Label of an extra "custom" entry, shown when the current tuning is not a preset */
  customLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const FAMILY_LABELS: Record<TabInstrumentFamily, string> = {
  guitar: 'Guitar',
  ukulele: 'Ukulele',
  bass: 'Bass',
  other: 'Other',
}

const groups = computed(() => {
  const families: TabInstrumentFamily[] = ['guitar', 'ukulele', 'bass', 'other']
  return families
    .map((family) => ({
      label: FAMILY_LABELS[family],
      tunings: TAB_TUNINGS.filter(
        (tuning) => tuning.family === family && (props.stringCount === undefined || tuning.strings.length === props.stringCount)
      ),
    }))
    .filter((group) => group.tunings.length > 0)
})

const onChange = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>
