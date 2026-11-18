import { $ } from '@wdio/globals'

// The banner a team's own pages show while the team (or the environment of the
// page) is disabled: what people can do, never why or who did it.
class TeamLockBanner {
  get root() {
    return $('[data-testid="team-lock-banner"]')
  }

  get heading() {
    return this.root.$('.govuk-notification-banner__heading')
  }
}

export default new TeamLockBanner()
