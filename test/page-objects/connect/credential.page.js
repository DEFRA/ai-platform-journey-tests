import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

class CredentialPage extends Page {
  get secretField() {
    return $('#credential-key')
  }
}

export default new CredentialPage()
