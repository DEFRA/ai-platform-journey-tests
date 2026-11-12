import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// The first step of a team's request. `/connect/team/start` starts a fresh
// journey and redirects here, so a leftover one never leaks into the test.
class SelectTeamPage extends Page {
  start() {
    return super.open('/connect/team/start')
  }

  teamOption(slug) {
    return $(`input[name="team"][value="${slug}"]`)
  }

  get continueButton() {
    return $('button*=Continue')
  }

  async choose(slug) {
    const option = this.teamOption(slug)
    await option.waitForExist()
    await $(`label[for="${await option.getAttribute('id')}"]`).click()
    await this.continueButton.click()
  }
}

export default new SelectTeamPage()
