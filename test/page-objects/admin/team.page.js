import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'

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
    const members = []

    for (const row of await this.memberRows) {
      const cells = await row.$$('td')

      members.push({
        name: (await cells[0].getText()).trim(),
        email: (await cells[1].getText()).trim(),
        role: (await cells[2].getText()).trim()
      })
    }

    return members
  }

  // The team's id, which the audit log's Team filter takes, from the link to it.
  async teamIdFromAuditLink() {
    const href = await this.viewAuditLogLink.getAttribute('href')

    return new URL(href, 'http://localhost').searchParams.get('team')
  }
}

export default new AdminTeamPage()
