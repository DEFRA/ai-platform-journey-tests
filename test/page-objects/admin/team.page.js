import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'
import { readEach } from '#support/element-values'

// A team in the Admin area: its status, service code, environments and
// members, with Add a member and a Remove link for each member.
class AdminTeamPage extends Page {
  open(teamRef) {
    return super.open(`/admin/teams/${teamRef}`)
  }

  get summary() {
    return $('[data-testid="team-summary"]')
  }

  get environments() {
    return $('[data-testid="team-environments"]')
  }

  get addMemberButton() {
    return $('[data-testid="add-member"]')
  }

  get viewAuditLogLink() {
    return $('[data-testid="view-audit-log"]')
  }

  get notification() {
    return $('[data-testid="team-notification"]')
  }

  get disableTeamButton() {
    return $('[data-testid="disable-team"]')
  }

  get enableTeamButton() {
    return $('[data-testid="enable-team"]')
  }

  // The warning shown while the team or one of its environments is disabled.
  get disabledWarning() {
    return $('[data-testid="team-disabled-warning"]')
  }

  // The "Disabled" tags: the team's own status tag is in the summary, and one
  // sits beside each environment that was disabled with it.
  get environmentDisabledTags() {
    return $$('[data-testid="environment-disabled"]')
  }

  get memberRows() {
    return $$('[data-testid="member-row"]')
  }

  // The value in the summary list beside a key such as "Status".
  summaryValue(key) {
    return this.summary.$(
      `.//dt[normalize-space()="${key}"]/following-sibling::dd[1]`
    )
  }

  memberRow(name) {
    return $(`//tr[@data-testid="member-row"][td[1][contains(., "${name}")]]`)
  }

  removeLink(name) {
    return this.memberRow(name).$('[data-testid="member-remove"]')
  }

  // Each member as the page shows them: { name, email, role }.
  async members() {
    const rows = await this.memberRows.getElements()

    return readEach(rows, async (row) => {
      const cells = await row.$$('td').getElements()
      const [name, email, role] = (
        await readEach(cells, (cell) => cell.getText())
      ).map((text) => text.trim())

      return { name, email, role }
    })
  }

  // The team's id, which the audit log's Team filter takes, from the link to it.
  async teamIdFromAuditLink() {
    const href = await this.viewAuditLogLink.getAttribute('href')

    return new URL(href, 'http://localhost').searchParams.get('team')
  }
}

export default new AdminTeamPage()
