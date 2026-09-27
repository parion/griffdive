<script setup lang="ts">
import { storedDiverName, rememberDiverName } from '~/composables/useGameSocket'
import { useOnboarding } from '~/composables/useOnboarding'

const route = useRoute()
const { markOnboardingSeen } = useOnboarding()

// `next` is the in-app path to land on when the briefing finishes — a room link
// for joiners, the home base for a first run. Anything else falls back to base.
const next = computed(() => {
  const raw = route.query.next
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value.startsWith('/') ? value : '/'
})
const joinMode = computed(() => next.value.startsWith('/dive/'))

const savedName = storedDiverName()
const initialName = computed(() => (savedName === 'Diver' ? '' : savedName))

function complete(payload: { name: string }): void {
  rememberDiverName(payload.name)
  markOnboardingSeen()
  navigateTo(next.value)
}

// Exiting without finishing still marks the tour seen — the home's "Take the
// tour" button is the way back in.
function exitOnboarding(): void {
  markOnboardingSeen()
  navigateTo('/')
}
</script>

<template>
  <main
    id="main-content"
    class="page onboarding-page"
    tabindex="-1"
  >
    <OnboardingFlow
      :initial-name="initialName"
      :join-mode="joinMode"
      @complete="complete"
      @exit="exitOnboarding"
    />
  </main>
</template>

<style scoped>
.onboarding-page { padding-block: 1.25rem 3rem; }
</style>
