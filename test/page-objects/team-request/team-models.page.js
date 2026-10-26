import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// A team's Models tab: one summary card per environment, one row per model.
class TeamModelsPage extends Page {
  open(teamSlug) {
    return super.open(`/teams/${teamSlug}`)
  }

  get rows() {
    return $$('[data-testid="model-row"]')
  }

  row(modelName) {
    return $(
      `//*[@data-testid="model-row"][.//dt[normalize-space()="${modelName}"]]`
    )
  }

  async statusOf(modelName) {
    return (await this.row(modelName).$('.govuk-tag').getText()).trim()
  }

  async reasonOf(modelName) {
    return (
      await this.row(modelName).$('[data-testid="model-reason"]').getText()
    ).trim()
  }
}

export default new TeamModelsPage()
