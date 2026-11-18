import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// A team Admin adds a client secret in one environment: an optional name, then
// the button. The next page shows the secret once.
class ClientSecretAddPage extends Page {
  get nameField() {
    return $('#name')
  }

  get addButton() {
    return $('[data-testid="confirm-add-client-secret"]')
  }

  // The page that shows the new secret, once.
  get added() {
    return $('[data-testid="client-secret-added"]')
  }

  async add(name) {
    await this.nameField.setValue(name)
    await this.addButton.click()
  }
}

export default new ClientSecretAddPage()
