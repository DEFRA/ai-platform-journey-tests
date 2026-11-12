import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// Change the limits of an environment: the question, then check your answers.
class LimitsPage extends Page {
  open(teamSlug, environment) {
    return super.open(`/environments/${teamSlug}/${environment}/limits`)
  }

  get tokensField() {
    return $('#tokensPerMinute')
  }

  get requestsField() {
    return $('#requestsPerMinute')
  }

  get tokensHint() {
    return $('#tokensPerMinute-hint')
  }

  get continueButton() {
    return $('button*=Continue')
  }

  get changeLimitsButton() {
    return $('button*=Change limits')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  get checkRows() {
    return $('.govuk-summary-list')
  }

  async answer({ tokensPerMinute, requestsPerMinute }) {
    await this.tokensField.setValue(String(tokensPerMinute))
    await this.requestsField.setValue(String(requestsPerMinute))
    await this.continueButton.click()
  }

  confirm() {
    return this.changeLimitsButton.click()
  }
}

export default new LimitsPage()
