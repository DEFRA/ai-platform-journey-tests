import { expect } from '@wdio/globals'

import SignInPage from '#page-objects/sign-in.page'
import AccessTypePage from '#page-objects/connect/access-type.page'
import ConnectModelPage from '#page-objects/connect/model.page'
import DetailsPage from '#page-objects/connect/details.page'
import CheckPage from '#page-objects/connect/check.page'
import CredentialPage from '#page-objects/connect/credential.page'

const MODEL_SLUG = process.env.JOURNEY_TEST_MODEL_SLUG || 'gpt-4o'

describe('Post-signin: research tier credential flow', () => {
  it('signs in, requests a shared credential and reveals the key once', async () => {
    await SignInPage.signIn()

    await AccessTypePage.open(MODEL_SLUG)
    await AccessTypePage.chooseShared()

    await ConnectModelPage.continue()

    await DetailsPage.complete('Journey test automated run')

    await CheckPage.confirm()

    await expect(CredentialPage.secretField).toBeDisplayed()
    const secret = await CredentialPage.secretField.getValue()
    expect(secret).not.toBe('')
  })
})
