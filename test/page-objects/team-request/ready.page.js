import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// What the request page becomes once every model of the request is active.
class ReadyPage extends Page {
  get panel() {
    return $('[data-testid="ready-panel"]')
  }
}

export default new ReadyPage()
