// What the B28 team-request journeys need to know about the environment they
// run against. Everything comes from the environment (see .env.local.example),
// and the journeys are opt-in: without JOURNEY_TEST_TEAM_SLUG they skip, so a
// run against a real environment never requests models by accident.

const DEFAULT_DEPLOY_TIMEOUT_MS = 120000

function list(value, fallback) {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return items.length > 0 ? items : fallback
}

function number(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)

  return Number.isNaN(parsed) ? fallback : parsed
}

// Each journey uses its own models: a model that is active for the team
// cannot be requested again, so journeys must not share one. The two failure
// journeys can share, because a failed request leaves the model free to
// request again.
export const journeyData = {
  teamSlug: process.env.JOURNEY_TEST_TEAM_SLUG,
  multiModelSlugs: list(process.env.JOURNEY_TEST_MULTI_MODEL_SLUGS, [
    'gpt-5-nano',
    'gpt-5-nano-2',
    'gpt-5-mini'
  ]),
  progressModelSlug: process.env.JOURNEY_TEST_PROGRESS_MODEL_SLUG || 'gpt-4o',
  noScriptModelSlug:
    process.env.JOURNEY_TEST_NO_SCRIPT_MODEL_SLUG || 'gpt-4o-2',
  failureModelSlug:
    process.env.JOURNEY_TEST_FAILURE_MODEL_SLUG || 'gpt-5-3-codex',
  // Only the mock orchestrator honours the forced-failure marker (Q4 = a).
  mockOrchestrator: process.env.JOURNEY_TEST_MOCK_ORCHESTRATOR === 'true',
  deployTimeoutMs: number(
    process.env.JOURNEY_TEST_DEPLOY_TIMEOUT_MS,
    DEFAULT_DEPLOY_TIMEOUT_MS
  )
}

// The marker the mock orchestrator looks for in a request's purpose (plan C6,
// P6-4). It forces the request to land on that terminal state.
export const FORCED_FAILURE_MARKERS = {
  checksFailed: '[mock:checks-failed]',
  deployFailed: '[mock:deploy-failed]'
}

/**
 * Skips the calling Mocha suite unless the journeys are configured. Call it
 * from a `before(function () {...})` hook, not an arrow function.
 * @param {Mocha.Context} context - `this` inside the hook.
 * @param {{ needsMock?: boolean }} [options]
 */
export function skipUnlessConfigured(context, { needsMock = false } = {}) {
  if (!journeyData.teamSlug) {
    context.skip()
  }

  if (needsMock && !journeyData.mockOrchestrator) {
    context.skip()
  }
}
