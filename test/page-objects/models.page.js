import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

class ModelsPage extends Page {
  open() {
    return super.open('/models')
  }

  modelLink(slug) {
    return $(`a[href="/models/${slug}"]`)
  }

  openModel(slug) {
    return this.modelLink(slug).click()
  }
}

export default new ModelsPage()
