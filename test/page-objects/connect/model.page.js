import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// Reached via AccessTypePage.chooseShared(); the model is pre-selected from
// the modelSlug query param carried through from the models page.
class ConnectModelPage extends Page {
  get continueButton() {
    return $('button*=Continue')
  }

  continue() {
    return this.continueButton.click()
  }
}

export default new ConnectModelPage()
