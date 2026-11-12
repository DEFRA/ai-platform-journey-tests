import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// Create a team: the question page, then check your answers.
class NewTeamPage extends Page {
  open() {
    return super.open('/teams/new')
  }

  get nameField() {
    return $('#name')
  }

  get serviceCodeField() {
    return $('#serviceCode')
  }

  get descriptionField() {
    return $('#description')
  }

  get continueButton() {
    return $('button*=Continue')
  }

  get createButton() {
    return $('button*=Create a team')
  }

  async create({ name, serviceCode, description }) {
    await this.open()
    await this.nameField.setValue(name)
    await this.serviceCodeField.setValue(serviceCode)
    await this.descriptionField.setValue(description)
    await this.continueButton.click()
    await this.createButton.click()
  }
}

export default new NewTeamPage()
