import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// The page the portal shows in place of an Admin page for someone who is not a
// Platform Admin (403), or for a team that does not exist (404).
class ErrorPage extends Page {
  get message() {
    return $('main .govuk-body')
  }

  // The plain paragraph of the portal's general error page (not the Admin
  // area's refusal page, whose text is in `message`).
  get plainMessage() {
    return $('main .govuk-grid-column-two-thirds > p')
  }

  get actionLink() {
    return $('main a.govuk-button')
  }
}

export default new ErrorPage()
