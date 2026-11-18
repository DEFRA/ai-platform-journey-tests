import { readEach } from '#support/element-values'

// The Admin area's two search forms as a session with script off sees them.
// They are GET forms, so they must work with nothing but the browser: each
// method takes the script-free session (see #support/no-script-session) and
// waits for the page that answers, whose address holds the question.
class AdminWithoutScriptPage {
  body(session) {
    return session.$('body')
  }

  async searchTeams(session, text) {
    await session.$('#search').setValue(text)
    await session.$('[data-testid="teams-search"]').click()
    await this.waitForQuery(session, 'search', text)
  }

  teamNames(session) {
    return this.firstLinkTexts(session, '[data-testid="team-row"]')
  }

  async filterAuditByAction(session, action) {
    await session.$('#action').selectByAttribute('value', action)
    await session.$('[data-testid="audit-apply"]').click()
    await this.waitForQuery(session, 'action', action)
  }

  async auditActions(session) {
    const rows = await session.$$('[data-testid="audit-row"]').getElements()

    // When, Who, Action: the third cell names what was done.
    return readEach(rows, async (row) => {
      const cells = await row.$$('td').getElements()

      return (await cells[2].getText()).trim()
    })
  }

  async firstLinkTexts(session, rowSelector) {
    const rows = await session.$$(rowSelector).getElements()
    const texts = await readEach(rows, (row) => row.$('a').getText())

    return texts.map((text) => text.trim())
  }

  waitForQuery(session, name, value) {
    return session.waitUntil(
      async () =>
        new URL(await session.getUrl()).searchParams.get(name) === value,
      { timeoutMsg: `Expected the address to hold ${name}=${value}` }
    )
  }
}

export default new AdminWithoutScriptPage()
