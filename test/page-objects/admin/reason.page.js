import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// The reason page that is also the confirmation: what happens, a reason of 1 to
// 500 characters (saved in the audit log, never shown to the team) and the
// button. Used to disable credentials, revoke one secret and disable a team.
class AdminReasonPage extends Page {
  get effect() {
    return $('[data-testid="credentials-effect"]')
  }

  get note() {
    return $('[data-testid="credentials-note"]')
  }

  get reasonField() {
    return $('#reason')
  }

  get submitButton() {
    return $('[data-testid="credentials-submit"]')
  }

  get cancelLink() {
    return $('[data-testid="credentials-cancel"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  get errorMessage() {
    return $('.govuk-error-message')
  }

  // Types the reason (an empty one leaves the field empty) and presses the button.
  async submitWith(reason) {
    await this.reasonField.setValue(reason)
    await this.submitButton.click()
  }
}

export default new AdminReasonPage()
