import { $, $$, browser } from '@wdio/globals'
import { Page } from '#page-objects/page'

// A Platform Admin adds a person from the directory to a team with a role.
// With script the name field is a combobox that finds people as they type;
// the option chosen shows as "Name - email".
class AdminAddMemberPage extends Page {
  open(teamRef) {
    return super.open(`/admin/teams/${teamRef}/members/add`)
  }

  get searchField() {
    return $('#search')
  }

  get options() {
    return $$('#search__listbox .autocomplete__option')
  }

  get addButton() {
    return $('[data-testid="add-member-submit"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  get errorMessage() {
    return $('.govuk-error-message')
  }

  role(value) {
    return $(`input[name="role"][value="${value}"]`)
  }

  // Types part of a name and chooses the person from the suggestions.
  async choosePerson(search, displayName) {
    await this.searchField.setValue(search)

    const option = $(
      `//ul[@id="search__listbox"]//li[contains(normalize-space(), "${displayName}")]`
    )

    await option.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: `Expected the directory to suggest ${displayName}`
    })
    await option.click()

    // Choosing is deliberate: the field now shows the person and a hidden
    // field holds them.
    await browser.waitUntil(
      async () => (await this.searchField.getValue()).includes(displayName),
      { timeoutMsg: `Expected ${displayName} to be chosen` }
    )
  }

  async add({ search, displayName, role }) {
    await this.choosePerson(search, displayName)
    await this.role(role).click()
    await this.addButton.click()
  }
}

export default new AdminAddMemberPage()
