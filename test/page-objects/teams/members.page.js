import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// A team's own Members tab (not the Admin area's): the people in it, and Add a
// member, which is greyed out while the team is disabled.
class TeamMembersPage extends Page {
  open(teamSlug) {
    return super.open(`/teams/${teamSlug}/members`)
  }

  get addMemberButton() {
    return $('[data-testid="add-member"]')
  }

  get status() {
    return $('[data-testid="team-status"]')
  }

  get notification() {
    return $('[data-testid="team-notification"]')
  }

  get memberRows() {
    return $$('[data-testid="member-row"]')
  }
}

export default new TeamMembersPage()
