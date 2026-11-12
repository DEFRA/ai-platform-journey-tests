import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// Environments: the person's teams, to choose one (more than one team).
class TeamsPage extends Page {
  open() {
    return super.open('/environments')
  }

  get teamLinks() {
    return $$('[data-testid="team-link"]')
  }

  teamLink(teamName) {
    return $(`[data-testid="team-link"]=${teamName}`)
  }

  chooseTeam(teamName) {
    return this.teamLink(teamName).click()
  }
}

export default new TeamsPage()
