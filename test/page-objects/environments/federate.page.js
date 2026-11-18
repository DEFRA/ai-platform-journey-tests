import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// A team Admin makes a passwordless credential for an application running on
// CDP, one question to a page: where it runs, which environments, its service,
// then the answers to check. The last page follows the change.
class FederatePage extends Page {
  // The start of the journey from an environment, as its button links to it.
  open(teamSlug, environment) {
    return super.open(
      `/environments/${teamSlug}/federate?environment=${environment}`
    )
  }

  get hostCdp() {
    return $('input[name="host"][value="cdp"]')
  }

  checkbox(code) {
    return $(`input[name="environments"][value="${code}"]`)
  }

  get serviceField() {
    return $('#service')
  }

  get continueButton() {
    return $('button.govuk-button')
  }

  // The confirmation panel when every environment is ready.
  get readyPanel() {
    return $('[data-testid="federated-panel"]')
  }

  // The "where it did not work" lead, shown when a change has finished badly.
  get lead() {
    return $('[data-testid="federate-lead"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }
}

export default new FederatePage()
