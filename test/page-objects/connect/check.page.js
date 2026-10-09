import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

class CheckPage extends Page {
  get confirmButton() {
    return $('button*=Confirm and get my key')
  }

  confirm() {
    return this.confirmButton.click()
  }
}

export default new CheckPage()
