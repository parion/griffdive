<script setup lang="ts">
import type { DiverState } from '~~/shared/engine/types'

// Kicking is a bar for the rest of the dive, so it is never one click. The
// network bar is opt-in: a shared address (household, LAN party, school,
// carrier NAT) would otherwise refuse friends who never did anything.
const props = defineProps<{
  diver: Pick<DiverState, 'id' | 'name'> | null
}>()

const emit = defineEmits<{
  confirm: [blockNetwork: boolean]
  cancel: []
}>()

const blockNetwork = ref(false)

const open = computed({
  get: () => props.diver !== null,
  set: (value: boolean) => {
    if (!value) {
      emit('cancel')
    }
  },
})

watch(() => props.diver?.id, () => {
  blockNetwork.value = false
})

function confirm(): void {
  emit('confirm', blockNetwork.value)
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    :title="`Kick ${diver?.name ?? 'diver'}?`"
    description="Their gear leaves with them as a claimable cache, and this dive will not seat them again."
    size="sm"
  >
    <label class="kick-net">
      <input
        v-model="blockNetwork"
        type="checkbox"
        data-testid="kick-block-network"
      >
      <span class="kick-net-copy">
        <span class="kick-net-title">Also block this diver's network</span>
        <span class="muted small">
          Refuses new joiners from the same Wi-Fi or LAN, which can lock out friends sharing it.
          Squadmates already seated keep their seats.
        </span>
      </span>
    </label>
    <template #footer>
      <div class="row">
        <button
          class="btn danger"
          type="button"
          @click="confirm"
        >
          Kick {{ diver?.name }}
        </button>
        <button
          class="btn ghost"
          type="button"
          @click="open = false"
        >
          Cancel
        </button>
      </div>
    </template>
  </AppDialog>
</template>

<style scoped>
.kick-net {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.75rem;
  border: 1px solid var(--line-2);
  cursor: pointer;
}
.kick-net input { flex-shrink: 0; margin-top: 0.2rem; }
.kick-net-copy { display: grid; gap: 0.25rem; }
.kick-net-title { color: var(--text); }
</style>
