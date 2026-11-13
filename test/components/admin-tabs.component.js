import { $ } from '@wdio/globals'

// The tabs under the Admin heading: Teams, Audit log and, once built, others.
// The current one is marked with aria-current="page".
class AdminTabs {
  get root() {
    return $('[data-testid="sub-navigation"]')
  }

  async tabTexts() {
    const links = await this.root.$$('a')
    const texts = []

    for (const link of links) {
      texts.push((await link.getText()).trim())
    }

    return texts
  }

  tab(text) {
    return this.root.$(`a=${text}`)
  }

  get currentTab() {
    return this.root.$('a[aria-current="page"]')
  }
}

export default new AdminTabs()
