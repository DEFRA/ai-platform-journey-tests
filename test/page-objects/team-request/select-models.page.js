import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

class SelectModelsPage extends Page {
  modelOption(slug) {
    return $(`input[name="modelSlugs"][value="${slug}"]`)
  }

  get continueButton() {
    return $('button*=Continue')
  }

  /**
   * Ticks one model and returns the name the page shows for it, so a journey
   * asserts on what a person reads rather than on a hard-coded display name.
   * @param {string} slug
   * @returns {Promise<string>}
   */
  async tick(slug) {
    const option = this.modelOption(slug)
    await option.waitForExist()
    const label = $(`label[for="${await option.getAttribute('id')}"]`)
    const name = (await label.getText()).trim()
    await label.click()

    return name
  }

  /**
   * @param {string[]} slugs
   * @returns {Promise<string[]>} The names of the models ticked, in order.
   */
  async chooseAll(slugs) {
    const names = []

    for (const slug of slugs) {
      names.push(await this.tick(slug))
    }

    await this.continueButton.click()

    return names
  }
}

export default new SelectModelsPage()
