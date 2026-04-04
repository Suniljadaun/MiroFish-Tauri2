import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Process from '../views/MainView.vue'
import SimulationView from '../views/SimulationView.vue'
import SimulationRunView from '../views/SimulationRunView.vue'
import ReportView from '../views/ReportView.vue'
import InteractionView from '../views/InteractionView.vue'
import SetupView from '../views/SetupView.vue'
import { isTauri, hasCredentials } from '../api/tauriBackend'

const routes = [
  {
    path: '/setup',
    name: 'Setup',
    component: SetupView,
    meta: { skipAuth: true }
  },
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/process/:projectId',
    name: 'Process',
    component: Process,
    props: true
  },
  {
    path: '/simulation/:simulationId',
    name: 'Simulation',
    component: SimulationView,
    props: true
  },
  {
    path: '/simulation/:simulationId/start',
    name: 'SimulationRun',
    component: SimulationRunView,
    props: true
  },
  {
    path: '/report/:reportId',
    name: 'Report',
    component: ReportView,
    props: true
  },
  {
    path: '/interaction/:reportId',
    name: 'Interaction',
    component: InteractionView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ── Navigation guard ─────────────────────────────────────────────
// In Tauri mode, redirect to /setup if no credentials are saved.
// In browser dev mode, this guard is a no-op.
router.beforeEach(async (to, _from, next) => {
  // Skip guard for browser dev mode or for the setup page itself
  if (!isTauri() || to.meta.skipAuth) {
    return next()
  }

  // Check if credentials exist
  const hasCreds = await hasCredentials()
  if (!hasCreds && to.name !== 'Setup') {
    return next({ name: 'Setup' })
  }

  next()
})

export default router
