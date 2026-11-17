import { $ } from '@wdio/globals'

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
    const links = await this.root.$$('a.govuk-service-navigation__link')
    const texts = []

    for (const link of links) {
      texts.push((await link.getText()).trim())
    }

    return texts.filter(Boolean)
  }
}

export default new ServiceNavigation()
