import { browser, expect, $ } from '@wdio/globals'

import AdminTabs from '#components/admin-tabs.component'
import AdminAddMemberPage from '#page-objects/admin/add-member.page'
import AdminAuditPage from '#page-objects/admin/audit.page'
import AdminRemoveMemberPage from '#page-objects/admin/remove-member.page'
import AdminTeamPage from '#page-objects/admin/team.page'
import { signInAs } from '#support/admin-session'
import { isMockStack } from '#support/mock-stack'
import { createTeam, newTeamNamed } from '#support/teams'

const describeOnMockStack = isMockStack() ? describe : describe.skip

// The backend's AUDIT_RETENTION_DAYS default; set the same variable here when
// the stack is started with another.
const RETENTION_DAYS = process.env.JOURNEY_TEST_AUDIT_RETENTION_DAYS || '30'
const PAGE_SIZE = 25
// More refusals than one page holds, so the filtered log pages.
const REFUSALS = PAGE_SIZE + 2

const SECOND_ADMIN = { search: 'bashir', displayName: 'Bashir Nasser' }
const MEMBER = { search: 'journey test', displayName: 'Journey Test Member' }
const OTHER_TEAM_MEMBER = { search: 'amelia', displayName: 'Amelia Hartley' }
const SIGNED_IN = { search: 'dev user', displayName: 'Dev User' }

const ACCESS_REFUSED = 'access.denied'
const MEMBER_ADDED = 'team.addMember'
const ACTION_ADDED_A_MEMBER = 'Added a member'

// The day, month and year in the UK today: what the From and To filters take.
function ukToday(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value])
  )

  return { day: parts.day, month: parts.month, year: parts.year }
}

async function addMemberAsAdmin(teamSlug, person, role) {
  await AdminAddMemberPage.open(teamSlug)
  await AdminAddMemberPage.add({ ...person, role })
  await expect(AdminTeamPage.notification).toBeDisplayed()
}

describeOnMockStack('Platform Admin: the audit log', function () {
  // The set up signs in twice, refuses a person many times and adds people.
  this.timeout(240000)

  const teamX = newTeamNamed('audit x', 'JAX')
  const teamY = newTeamNamed('audit y', 'JAY')
  let teamXId

  before(async () => {
    // A person with no Platform Admin role is refused each time they open the
    // log: that refusal is itself audited.
    await signInAs('non-admin')

    for (let refusal = 0; refusal < REFUSALS; refusal++) {
      await AdminAuditPage.open()
    }

    await signInAs('admin')

    // Team X: another Admin joins, the Platform Admin leaves, then tries to add
    // themselves (refused) and adds a member. Team Y: an ordinary add.
    const slugX = await createTeam(teamX)
    await addMemberAsAdmin(slugX, SECOND_ADMIN, 'admin')
    await AdminTeamPage.removeLink('Dev User').click()
    await AdminRemoveMemberPage.confirm()
    await AdminAddMemberPage.open(slugX)
    await AdminAddMemberPage.add({ ...SIGNED_IN, role: 'admin' })
    await expect(AdminAddMemberPage.errorSummary).toBeDisplayed()
    await addMemberAsAdmin(slugX, MEMBER, 'user')

    const slugY = await createTeam(teamY)
    await addMemberAsAdmin(slugY, OTHER_TEAM_MEMBER, 'user')

    await AdminTeamPage.open(slugX)
    teamXId = await AdminTeamPage.teamIdFromAuditLink()
  })

  describe('the whole log', () => {
    it('lists the events newest first, 25 a page, and says how long they are kept', async () => {
      await AdminAuditPage.open()

      await expect(AdminTabs.currentTab).toHaveText('Audit log')
      await expect(AdminAuditPage.rows).toBeElementsArrayOfSize(PAGE_SIZE)
      await expect(AdminAuditPage.count).toHaveText(
        expect.stringMatching(
          new RegExp(
            `^Showing 1 to ${PAGE_SIZE} of \\d+ events\\. Events are kept for ${RETENTION_DAYS} days\\.$`
          )
        )
      )

      const times = await AdminAuditPage.times()
      const newestFirst = [...times].sort().reverse()

      await expect(times).toEqual(newestFirst)
    })

    it('shows who did what to which team, with the outcome as text', async () => {
      await AdminAuditPage.open(`?team=${teamXId}`)
      const events = await AdminAuditPage.events()

      const added = events.find(
        (event) =>
          event.action.includes(ACTION_ADDED_A_MEMBER) &&
          event.action.includes(`Person affected: ${SECOND_ADMIN.displayName}`)
      )

      await expect(added).toEqual(
        expect.objectContaining({
          who: expect.stringContaining('Dev User'),
          team: teamX.name,
          outcome: 'Done'
        })
      )
      await expect(added.who).toContain('Platform Admin')

      const selfAdd = events.find((event) =>
        event.action.includes('Refused: adding yourself to a team')
      )

      await expect(selfAdd).toEqual(
        expect.objectContaining({ team: teamX.name, outcome: 'Refused' })
      )

      const removed = events.find(
        (event) =>
          event.action.includes('Removed a member') &&
          event.who.includes('Dev User')
      )

      await expect(removed).toEqual(
        expect.objectContaining({ team: teamX.name, outcome: 'Done' })
      )
    })

    it('shows the refusal of a person who is not a Platform Admin', async () => {
      await AdminAuditPage.open(`?action=${ACCESS_REFUSED}`)
      const events = await AdminAuditPage.events()

      const refusal = events.find((event) =>
        event.action.includes('Refused: Platform Admin role needed')
      )

      await expect(refusal).toEqual(
        expect.objectContaining({ outcome: 'Refused' })
      )
      await expect(refusal.who).toContain('Dev User')
    })

    it('shows names and no email address, object ID or token', async () => {
      await AdminAuditPage.open(`?team=${teamXId}`)
      const text = await $('main').getText()

      await expect(text).toContain('Bashir Nasser')
      await expect(text).not.toMatch(/\S+@\S+/)
      await expect(text).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      )
      await expect(text).not.toMatch(/Bearer|eyJ/)
    })
  })

  describe('filters', () => {
    it('shows only the events of the team chosen and keeps the choice', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.filterBy({ team: teamXId })

      const events = await AdminAuditPage.events()

      await expect(events.length).toBeGreaterThan(0)
      await expect(events.map(({ team }) => team)).toEqual(
        events.map(() => teamX.name)
      )
      await expect(AdminAuditPage.teamSelect).toHaveValue(teamXId)
      await expect(AdminAuditPage.clearFiltersLink).toBeDisplayed()
    })

    it('shows only the action chosen, across teams', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.filterBy({ action: MEMBER_ADDED })

      const events = await AdminAuditPage.events()

      await expect(events.map(({ team }) => team)).toEqual(
        expect.arrayContaining([teamX.name, teamY.name])
      )
      await expect(
        events.every((event) => event.action.includes(ACTION_ADDED_A_MEMBER))
      ).toBe(true)
    })

    it('shows only the actor type chosen', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.filterBy({ actorType: 'platform-admin' })

      const events = await AdminAuditPage.events()

      await expect(events.length).toBeGreaterThan(0)
      await expect(
        events.every((event) => event.who.includes('Platform Admin'))
      ).toBe(true)
    })

    it('finds a person by part of their name, ignoring case', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.filterBy({ person: 'DEV us' })

      const events = await AdminAuditPage.events()

      await expect(events.length).toBeGreaterThan(0)
      await expect(
        events.every((event) => event.who.includes('Dev User'))
      ).toBe(true)
    })

    it('combines the filters and shows only what matches all of them', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.filterBy({ team: teamXId, action: MEMBER_ADDED })

      const events = await AdminAuditPage.events()

      await expect(events.length).toBeGreaterThanOrEqual(2)
      await expect(
        events.every(
          (event) =>
            event.team === teamX.name &&
            event.action.includes(ACTION_ADDED_A_MEMBER)
        )
      ).toBe(true)
    })

    it('includes today when the dates are today, and nothing when From is tomorrow', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.enterDate('from', ukToday())
      await AdminAuditPage.enterDate('to', ukToday())
      await AdminAuditPage.applyAndWait({ 'from-day': ukToday().day })

      await expect(AdminAuditPage.rows).toBeElementsArrayOfSize({ gte: 1 })

      await AdminAuditPage.enterDate('from', ukToday(1))
      await AdminAuditPage.enterDate('to', ukToday(1))
      await AdminAuditPage.applyAndWait({ 'from-day': ukToday(1).day })

      await expect(AdminAuditPage.empty).toHaveText(
        expect.stringContaining('No events match')
      )
    })

    it('pages the filtered log and keeps the filter on the next page', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.filterBy({ action: ACCESS_REFUSED })

      await expect(AdminAuditPage.count).toHaveText(
        expect.stringContaining(`Showing 1 to ${PAGE_SIZE} of`)
      )

      await AdminAuditPage.nextPageLink.click()

      await expect(browser).toHaveUrl(expect.stringContaining('page=2'))
      await expect(AdminAuditPage.actionSelect).toHaveValue(ACCESS_REFUSED)
      await expect(AdminAuditPage.count).toHaveText(
        expect.stringContaining(`Showing ${PAGE_SIZE + 1} to`)
      )
    })

    it('says so when no event matches and clears the filters', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.filterBy({ person: 'zzzz no such person' })

      await expect(AdminAuditPage.empty).toHaveText(
        expect.stringContaining('No events match')
      )
      await expect(AdminAuditPage.empty).toHaveText(
        expect.stringContaining(`goes back ${RETENTION_DAYS} days`)
      )

      await AdminAuditPage.clearFiltersLink.click()

      await expect(browser).toHaveUrl(expect.stringMatching(/\/admin\/audit$/))
      await expect(AdminAuditPage.rows).toBeElementsArrayOfSize({ gte: 1 })
    })
  })

  describe('a filter that cannot be used', () => {
    it('refuses a date that is incomplete, and keeps what was typed', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.dateField('from', 'day').setValue('3')
      await AdminAuditPage.applyAndWait({ 'from-day': '3' })

      await expect(AdminAuditPage.errorSummary).toHaveText(
        expect.stringContaining('From date must include a month and year')
      )
      await expect(browser).toHaveTitle(expect.stringContaining('Error: '))
      await expect(AdminAuditPage.dateField('from', 'day')).toHaveValue('3')
      await expect(AdminAuditPage.rows).toBeElementsArrayOfSize(0)
    })

    it('refuses a date that is not real', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.enterDate('to', {
        day: '31',
        month: '2',
        year: '2026'
      })
      await AdminAuditPage.applyAndWait({ 'to-day': '31' })

      await expect(AdminAuditPage.errorSummary).toHaveText(
        expect.stringContaining('To date must be a real date')
      )
      await expect(AdminAuditPage.rows).toBeElementsArrayOfSize(0)
    })

    it('refuses From after To', async () => {
      await AdminAuditPage.open()
      await AdminAuditPage.enterDate('from', {
        day: '10',
        month: '3',
        year: '2026'
      })
      await AdminAuditPage.enterDate('to', {
        day: '9',
        month: '3',
        year: '2026'
      })
      await AdminAuditPage.applyAndWait({ 'from-day': '10' })

      await expect(AdminAuditPage.errorSummary).toHaveText(
        expect.stringContaining(
          'To date must be the same as or after the From date'
        )
      )
    })

    for (const [what, person] of [
      ['too short', 'a'],
      ['too long', 'a'.repeat(101)]
    ]) {
      it(`refuses a person that is ${what}`, async () => {
        await AdminAuditPage.open()
        await AdminAuditPage.filterBy({ person })

        await expect(AdminAuditPage.errorSummary).toHaveText(
          expect.stringContaining('Person must be 2 to 100 characters')
        )
        await expect(browser).toHaveTitle(expect.stringContaining('Error: '))
        await expect(AdminAuditPage.rows).toBeElementsArrayOfSize(0)
      })
    }
  })

  describe('from a team', () => {
    it('opens the log with that team chosen, from the team page', async () => {
      await AdminTeamPage.open(teamXId)
      await AdminTeamPage.viewAuditLogLink.click()

      await expect(browser).toHaveUrl(
        expect.stringContaining(`/admin/audit?team=${teamXId}`)
      )
      await expect(AdminAuditPage.teamSelect).toHaveValue(teamXId)

      const events = await AdminAuditPage.events()

      await expect(events.map(({ team }) => team)).toEqual(
        events.map(() => teamX.name)
      )
    })
  })
})
