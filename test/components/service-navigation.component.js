import { $ } from '@wdio/globals'

import { readEach } from '#support/element-values'

// The service navigation under the header: Home, Model catalogue, Personal
// access, Teams, Environments (and Admin for a Platform Admin) and Help once
// signed in; Home, Model catalogue and Help before.
class ServiceNavigation {
  get root() {
    return $('.govuk-service-navigation')
  }

  link(text) {
    return this.root.$(`a=${text}`)
  }

  async linkTexts() {
    const links = await this.root
      .$$('a.govuk-service-navigation__link')
      .getElements()
    const texts = await readEach(links, (link) => link.getText())

    return texts.map((text) => text.trim()).filter(Boolean)
  }
}

export default new ServiceNavigation()
