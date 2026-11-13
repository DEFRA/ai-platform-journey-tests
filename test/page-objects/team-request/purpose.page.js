import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// "What is it for": the purpose step of a team's request.
class PurposePage extends Page {
  get purposeField() {
    return $('#purpose')
  }

  get continueButton() {
    return $('button*=Continue')
  }

  async complete(purpose) {
    await this.purposeField.setValue(purpose)
    await this.continueButton.click()
  }
}

export default new PurposePage()
