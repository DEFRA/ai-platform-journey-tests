import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

class AccessTypePage extends Page {
  open(modelSlug) {
    return super.open(
      modelSlug ? `/connect?modelSlug=${modelSlug}` : '/connect'
    )
  }

  get sharedOption() {
    return $('input[name="accessType"][value="shared"]')
  }

  get continueButton() {
    return $('button*=Continue')
  }

  async chooseShared() {
    await this.sharedOption.click()
    await this.continueButton.click()
  }
}

export default new AccessTypePage()
