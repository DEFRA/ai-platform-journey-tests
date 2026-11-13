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
    const actions = []

    for (const row of await session.$$('[data-testid="audit-row"]')) {
      // When, Who, Action: the third cell names what was done.
      const cells = await row.$$('td')

      actions.push((await cells[2].getText()).trim())
    }

    return actions
  }

  async firstLinkTexts(session, rowSelector) {
    const texts = []

    for (const row of await session.$$(rowSelector)) {
      texts.push((await row.$('a').getText()).trim())
    }

    return texts
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
