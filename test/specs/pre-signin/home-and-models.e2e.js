import { browser, expect } from '@wdio/globals'

import HomePage from '#page-objects/home.page'
import ModelsPage from '#page-objects/models.page'

const MODEL_SLUG = process.env.JOURNEY_TEST_MODEL_SLUG || 'gpt-4o'

describe('Pre-signin: home and model browsing', () => {
  it('shows the signed-out home page', async () => {
    await HomePage.open()
    await expect(browser).toHaveTitle('Home | AI Platform Portal')
    await expect(HomePage.pageHeading).toBeDisplayed()
  })

  it('lists models without needing to sign in', async () => {
    await ModelsPage.open()
    await expect(ModelsPage.modelLink(MODEL_SLUG)).toBeDisplayed()
  })

  it('shows a model detail page', async () => {
    await ModelsPage.open()
    await ModelsPage.openModel(MODEL_SLUG)
    await expect(browser).toHaveUrl(
      expect.stringContaining(`/models/${MODEL_SLUG}`)
    )
  })
})
