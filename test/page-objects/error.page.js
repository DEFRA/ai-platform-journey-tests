import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// The page the portal shows in place of an Admin page for someone who is not a
// Platform Admin (403), or for a team that does not exist (404).
class ErrorPage extends Page {
  get message() {
    return $('main .govuk-body')
  }

  get actionLink() {
    return $('main a.govuk-button')
  }
}

export default new ErrorPage()
