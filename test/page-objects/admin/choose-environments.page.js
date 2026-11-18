import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'
import { forEachInOrder, readEach } from '#support/element-values'

// "Which environments?": the first step of Disable credentials, Disable team and
// Enable team (and Enable credentials), one checkbox for each environment on offer.
class AdminChooseEnvironmentsPage extends Page {
  get legend() {
    return $('.govuk-fieldset__legend')
  }

  get checkboxes() {
    return $$('input[name="environments"]')
  }

  get submitButton() {
    return $('[data-testid="credentials-submit"]')
  }

  get cancelLink() {
    return $('[data-testid="credentials-cancel"]')
  }

  // Shown instead of the choice when there is nothing to choose or do.
  get nothingToDo() {
    return $('[data-testid="nothing-to-do"]')
  }

  get noEnvironments() {
    return $('[data-testid="no-environments"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  // The hint under "Which environments?" and the message beside the boxes.
  get hint() {
    return $('#environments-hint')
  }

  get fieldError() {
    return $('#environments-error')
  }

  checkbox(code) {
    return $(`input[name="environments"][value="${code}"]`)
  }

  // The environments ticked, by the label beside each.
  async tickedLabels() {
    const boxes = await this.checkboxes.getElements()
    const labels = await readEach(boxes, async (box) => {
      if (!(await box.isSelected())) {
        return null
      }

      const id = await box.getAttribute('id')

      return (await $(`label[for="${id}"]`).getText()).trim()
    })

    return labels.filter((label) => label !== null)
  }

  // Ticks exactly the environments named (by code), unticking any other.
  async choose(codes) {
    const boxes = await this.checkboxes.getElements()
    const toChange = await readEach(boxes, async (box) => {
      const wanted = codes.includes(await box.getAttribute('value'))

      return (await box.isSelected()) === wanted ? null : box
    })

    await forEachInOrder(
      toChange.filter((box) => box !== null),
      (box) => box.click()
    )
  }
}

export default new AdminChooseEnvironmentsPage()
