import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// What the request page becomes when a model could not be set up: the reason
// for a person, then the technical details for the AI Platform team.
class FailedPage extends Page {
  get reason() {
    return $('[data-testid="failure-reason"]')
  }

  get supportReference() {
    return $('[data-testid="support-reference"]')
  }

  get technicalDetails() {
    return $('[data-testid="technical-details"]')
  }

  async openTechnicalDetails() {
    await this.technicalDetails.$('summary').click()
  }
}

export default new FailedPage()
