import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'
import { readEach } from '#support/element-values'

// "Check your answers": one summary, and one button, for every model chosen.
class CheckRequestPage extends Page {
  get requestAccessButton() {
    return $('button*=Request access')
  }

  get summaryValues() {
    return $$('.govuk-summary-list__value')
  }

  async summaryText() {
    const values = await this.summaryValues.getElements()
    const texts = await readEach(values, (value) => value.getText())

    return texts.join('\n')
  }

  requestAccess() {
    return this.requestAccessButton.click()
  }
}

export default new CheckRequestPage()
