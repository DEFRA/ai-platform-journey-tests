import { $ } from '@wdio/globals'

import { readEach } from '#support/element-values'

// The tabs under the Admin heading: Teams, Audit log and, once built, others.
// The current one is marked with aria-current="page".
class AdminTabs {
  get root() {
    return $('[data-testid="sub-navigation"]')
  }

  async tabTexts() {
    const links = await this.root.$$('a').getElements()
    const texts = await readEach(links, (link) => link.getText())

    return texts.map((text) => text.trim())
  }

  tab(text) {
    return this.root.$(`a=${text}`)
  }

  get currentTab() {
    return this.root.$('a[aria-current="page"]')
  }
}

export default new AdminTabs()
