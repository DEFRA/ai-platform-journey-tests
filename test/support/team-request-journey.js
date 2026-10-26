import { browser } from '@wdio/globals'

import SelectTeamPage from '#page-objects/team-request/select-team.page'
import SelectModelsPage from '#page-objects/team-request/select-models.page'
import PurposePage from '#page-objects/team-request/purpose.page'
import CheckRequestPage from '#page-objects/team-request/check-request.page'

/**
 * Walks a team's request to "Check your answers": start, choose the team and
 * the models, say what it is for.
 * @param {{ teamSlug: string, modelSlugs: string[], purpose: string }} request
 * @returns {Promise<string[]>} The names the page shows for the models.
 */
export async function chooseModels({ teamSlug, modelSlugs, purpose }) {
  await SelectTeamPage.start()
  await SelectTeamPage.choose(teamSlug)

  const names = await SelectModelsPage.chooseAll(modelSlugs)

  await PurposePage.complete(purpose)

  return names
}

/**
 * Presses "Request access" and waits for the request page.
 * @returns {Promise<string>} The request page's path.
 */
export async function submitRequest() {
  await CheckRequestPage.requestAccess()

  await browser.waitUntil(
    async () => (await browser.getUrl()).includes('/connect/team/request/'),
    { timeoutMsg: 'Expected to land on the request page after requesting' }
  )

  return new URL(await browser.getUrl()).pathname
}

/**
 * Asks for models for a team the way a person does, from the start to the
 * request page.
 * @param {{ teamSlug: string, modelSlugs: string[], purpose: string }} request
 * @returns {Promise<{ names: string[], requestPath: string }>}
 */
export async function requestModels(request) {
  const names = await chooseModels(request)

  return { names, requestPath: await submitRequest() }
}
