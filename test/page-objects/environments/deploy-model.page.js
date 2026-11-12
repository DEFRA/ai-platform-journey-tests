import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// "Deploy a model" from an environment page: the team and environment are
// already chosen, so the journey asks for the models, what they are for, then
// check your answers.
class DeployModelPage extends Page {
  modelCheckbox(modelSlug) {
    return $(`input[name="modelSlugs"][value="${modelSlug}"]`)
  }

  get purposeField() {
    return $('#purpose')
  }

  get environmentInset() {
    return $('[data-testid="environment-inset"]')
  }

  get continueButton() {
    return $('button*=Continue')
  }

  get requestAccessButton() {
    return $('button*=Request access')
  }

  async chooseModel(modelSlug) {
    await this.modelCheckbox(modelSlug).click()
    await this.continueButton.click()
  }

  async describe(purpose) {
    await this.purposeField.setValue(purpose)
    await this.continueButton.click()
  }

  requestAccess() {
    return this.requestAccessButton.click()
  }
}

export default new DeployModelPage()
