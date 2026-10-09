import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

class DetailsPage extends Page {
  get purposeField() {
    return $('#purpose')
  }

  get agreeCheckbox() {
    return $('#agreeToTerms')
  }

  get continueButton() {
    return $('button*=Continue')
  }

  async complete(purpose) {
    await this.purposeField.setValue(purpose)
    await this.agreeCheckbox.click()
    await this.continueButton.click()
  }
}

export default new DetailsPage()
