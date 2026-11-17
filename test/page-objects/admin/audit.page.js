import { $, $$, browser } from '@wdio/globals'
import { Page } from '#page-objects/page'
import { forEachInOrder, readEach } from '#support/element-values'

// The Admin area's Audit log tab: every event, newest first, with filters.
class AdminAuditPage extends Page {
  open(query = '') {
    return super.open(`/admin/audit${query}`)
  }

  get filterForm() {
    return $('form[aria-labelledby="filter-heading"]')
  }

  get teamSelect() {
    return $('#team')
  }

  get environmentSelect() {
    return $('#environment')
  }

  get actionSelect() {
    return $('#action')
  }

  get actorTypeSelect() {
    return $('#actorType')
  }

  get personField() {
    return $('#person')
  }

  get applyButton() {
    return $('[data-testid="audit-apply"]')
  }

  get clearFiltersLink() {
    return $('[data-testid="audit-clear"]')
  }

  get count() {
    return $('[data-testid="audit-count"]')
  }

  get empty() {
    return $('[data-testid="audit-empty"]')
  }

  get table() {
    return $('[data-testid="audit-table"]')
  }

  get rows() {
    return $$('[data-testid="audit-row"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  get errorMessages() {
    return $$('.govuk-error-message')
  }

  get nextPageLink() {
    return $('.govuk-pagination__next a')
  }

  dateField(which, part) {
    return $(`#${which}-${part}`)
  }

  async enterDate(which, { day, month, year }) {
    await this.dateField(which, 'day').setValue(day)
    await this.dateField(which, 'month').setValue(month)
    await this.dateField(which, 'year').setValue(year)
  }

  // Applies the filters named ({ team, environment, action, actorType, person },
  // a select's value or the text of Person) and waits for the page that answers,
  // a GET form whose address holds them.
  async filterBy(filters) {
    const { person, ...selects } = filters
    const selectFor = {
      team: this.teamSelect,
      environment: this.environmentSelect,
      action: this.actionSelect,
      actorType: this.actorTypeSelect
    }

    await forEachInOrder(Object.entries(selects), ([name, value]) =>
      selectFor[name].selectByAttribute('value', value)
    )

    if (person !== undefined) {
      await this.personField.setValue(person)
    }

    await this.applyAndWait(filters)
  }

  // Applies what is on the form and waits until the address holds `expected`.
  async applyAndWait(expected) {
    await this.applyButton.click()
    await browser.waitUntil(
      async () => {
        const { searchParams } = new URL(await browser.getUrl())

        return Object.entries(expected).every(
          ([name, value]) => searchParams.get(name) === value
        )
      },
      { timeoutMsg: 'Expected the address to hold the filters applied' }
    )
  }

  // Each row as the page shows it: When, Who (name and type), Action (with any
  // reason or person affected beneath), Team, Environment and Outcome.
  async events() {
    const rows = await this.rows.getElements()

    return readEach(rows, async (row) => {
      const cells = await row.$$('td').getElements()
      const texts = await readEach(cells, (cell) => cell.getText())
      const [when, who, action, team, environment, outcome] = texts.map(
        (text) => text.trim()
      )

      return { when, who, action, team, environment, outcome }
    })
  }

  // Each event's time as the page marks it up (ISO), in the order shown.
  async times() {
    const timeElements = await $$(
      '[data-testid="audit-row"] time'
    ).getElements()

    return readEach(timeElements, (time) => time.getAttribute('datetime'))
  }

  async teamOptions() {
    const options = await this.teamSelect.$$('option').getElements()
    const texts = await readEach(options, (option) => option.getText())

    return texts.map((text) => text.trim())
  }
}

export default new AdminAuditPage()
