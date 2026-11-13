import { browser, expect } from '@wdio/globals'

import AdminTabs from '#components/admin-tabs.component'
import AdminTeamPage from '#page-objects/admin/team.page'
import AdminTeamsPage from '#page-objects/admin/teams.page'
import ErrorPage from '#page-objects/error.page'
import { signInAs } from '#support/admin-session'
import { isMockStack, setTeamStatus } from '#support/mock-stack'
import { createTeam } from '#support/teams'

const describeOnMockStack = isMockStack() ? describe : describe.skip

// One stamp for the three teams, so a search for it finds exactly them and
// they sort as alpha, bravo, charlie.
const stamp = Date.now().toString(36)
const named = (purpose, serviceCode) => ({
  name: `Admin journey ${stamp} ${purpose}`,
  serviceCode
})
const active = named('alpha', 'JTA')
const disabled = named('bravo', 'JTB')
const pendingRemoval = named('charlie', 'JTC')

describeOnMockStack('Platform Admin: finding a team and opening it', () => {
  before(async () => {
    await signInAs('admin')

    await createTeam(active)
    await setTeamStatus(await createTeam(disabled), 'disabled')
    await setTeamStatus(await createTeam(pendingRemoval), 'pending-removal')
  })

  it('lists teams by name with their status, environments and members', async () => {
    await AdminTeamsPage.open(`?search=${encodeURIComponent(stamp)}`)

    await expect(await AdminTeamsPage.teamNames()).toEqual([
      active.name,
      disabled.name,
      pendingRemoval.name
    ])
    await expect(AdminTeamsPage.count).toHaveText('Showing 1 to 3 of 3 teams')
    await expect(AdminTeamsPage.status(active.name)).toHaveText('Active')
    await expect(AdminTeamsPage.status(disabled.name)).toHaveText('Disabled')
    await expect(AdminTeamsPage.status(pendingRemoval.name)).toHaveText(
      'Pending removal'
    )
  })

  it('finds a team by part of its name', async () => {
    await AdminTeamsPage.open()
    await AdminTeamsPage.search(`${stamp} bravo`)

    await expect(await AdminTeamsPage.teamNames()).toEqual([disabled.name])
    await expect(AdminTeamsPage.searchField).toHaveValue(`${stamp} bravo`)
  })

  for (const [label, team] of [
    ['Active', active],
    ['Disabled', disabled],
    ['Pending removal', pendingRemoval]
  ]) {
    it(`narrows the list to ${label} teams`, async () => {
      await AdminTeamsPage.open(`?search=${encodeURIComponent(stamp)}`)
      await AdminTeamsPage.filterByStatus(label)

      await expect(await AdminTeamsPage.teamNames()).toEqual([team.name])
      await expect(AdminTeamsPage.searchField).toHaveValue(stamp)
    })
  }

  it('says so when no team matches and clears the filters', async () => {
    await AdminTeamsPage.open()
    await AdminTeamsPage.search(`${stamp} no such team`)

    await expect(AdminTeamsPage.empty).toHaveText(
      expect.stringContaining('No teams match your search')
    )

    await AdminTeamsPage.clearFiltersLink.click()

    await expect(browser).toHaveUrl(expect.stringMatching(/\/admin\/teams$/))
    await expect(AdminTeamsPage.empty).not.toBeDisplayed()
    await expect(AdminTeamsPage.count).toBeDisplayed()
  })

  it('refuses a search that is too short and keeps what was typed', async () => {
    await AdminTeamsPage.open()
    await AdminTeamsPage.search('a')

    await expect(AdminTeamsPage.errorSummary).toHaveText(
      expect.stringContaining('Search must be 2 to 100 characters')
    )
    await expect(browser).toHaveTitle(expect.stringContaining('Error:'))
    await expect(AdminTeamsPage.searchField).toHaveValue('a')
    await expect(AdminTeamsPage.rows).toBeElementsArrayOfSize(0)
  })

  for (const [label, team, status] of [
    ['an active', active, 'Active'],
    ['a disabled', disabled, 'Disabled'],
    ['a pending removal', pendingRemoval, 'Pending removal']
  ]) {
    it(`opens ${label} team to show its status, service code, environments and members`, async () => {
      await AdminTeamsPage.open(`?search=${encodeURIComponent(stamp)}`)
      await AdminTeamsPage.teamLink(team.name).click()

      await expect(AdminTeamPage.pageHeading).toHaveText(team.name)
      await expect(AdminTabs.currentTab).toHaveText('Teams')
      await expect(AdminTeamPage.summaryValue('Status')).toHaveText(status)
      await expect(AdminTeamPage.summaryValue('Service code')).toHaveText(
        team.serviceCode
      )
      await expect(AdminTeamPage.summaryValue('Environments')).toBeDisplayed()
      await expect(await AdminTeamPage.members()).toEqual([
        expect.objectContaining({ name: 'Dev User (you)', role: 'Admin' })
      ])
    })
  }

  it('shows the not found page for a team that does not exist', async () => {
    await AdminTeamPage.open(`no-such-team-${stamp}`)

    await expect(ErrorPage.pageHeading).toHaveText('Team not found')
    await expect(ErrorPage.actionLink).toHaveText('Back to the teams')

    await ErrorPage.actionLink.click()
    await expect(AdminTeamsPage.pageHeading).toHaveText('Teams')
  })

  describe('more teams than fit on a page', function () {
    // Creating a page and a bit more of teams takes a while.
    this.timeout(300000)

    const pageSize = 25
    // Not containing the stamp above, so the searches there never find these.
    const longStamp = [...stamp].reverse().join('') + 'x'
    const teamCount = pageSize + 1

    before(async () => {
      // A team's slug, which must be unique, holds only the first 24 letters
      // of its name, so the number has to come early: a short prefix.
      for (let number = 1; number <= teamCount; number++) {
        await createTeam({
          name: `Jt ${longStamp} page ${String(number).padStart(2, '0')}`,
          serviceCode: 'JTP'
        })
      }
    })

    it('shows 25 teams a page and keeps the search on the next page', async () => {
      await AdminTeamsPage.open(`?search=${encodeURIComponent(longStamp)}`)

      await expect(AdminTeamsPage.rows).toBeElementsArrayOfSize(pageSize)
      await expect(AdminTeamsPage.count).toHaveText(
        `Showing 1 to ${pageSize} of ${teamCount} teams`
      )

      await AdminTeamsPage.nextPageLink.click()

      await expect(browser).toHaveUrl(expect.stringContaining('page=2'))
      await expect(AdminTeamsPage.searchField).toHaveValue(longStamp)
      await expect(AdminTeamsPage.rows).toBeElementsArrayOfSize(1)
      await expect(AdminTeamsPage.count).toHaveText(
        `Showing ${teamCount} to ${teamCount} of ${teamCount} teams`
      )
    })
  })
})
