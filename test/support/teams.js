import { $$, browser } from '@wdio/globals'

import NewTeamPage from '#page-objects/teams/new-team.page'

// A team's own pages: /teams/{slug}/... but not the "new" page that asks for one.
const TEAM_PATH = /^\/teams\/(?!new(?:\/|$))([^/]+)/

// The errors on the page, when there are any: why nothing happened.
async function pageProblem() {
  const errors = $$('.govuk-error-summary__list li')
  const texts = await errors.map((error) => error.getText())

  return texts.length > 0 ? texts.join('; ') : 'no error shown'
}

/**
 * Creates a team through the portal, as the person signed in (who becomes its
 * Admin), and returns its slug, which the portal puts in the address after
 * creating it (/teams/{slug}/members).
 * @param {{name: string, serviceCode: string, description?: string}} team
 * @returns {Promise<string>}
 */
export async function createTeam({
  name,
  serviceCode,
  description = 'Created by the journey tests'
}) {
  await NewTeamPage.create({ name, serviceCode, description })

  try {
    await browser.waitUntil(async () =>
      TEAM_PATH.test(new URL(await browser.getUrl()).pathname)
    )
  } catch {
    throw new Error(
      `The team "${name}" was not created: ${await pageProblem()}`
    )
  }

  const [, slug] = new URL(await browser.getUrl()).pathname.match(TEAM_PATH)

  return slug
}

/**
 * A name and a service code no earlier run has used, because a team's name and
 * so its slug cannot change.
 * @param {string} purpose
 * @param {string} serviceCode
 */
export function newTeamNamed(purpose, serviceCode) {
  const stamp = Date.now().toString(36)

  return { name: `Admin journey ${stamp} ${purpose}`, serviceCode }
}
