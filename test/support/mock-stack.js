import process from 'node:process'
import { MongoClient } from 'mongodb'

// Setup for journeys that need data the portal pages cannot create: who holds
// the Platform Admin role, and a team's status. It talks to the local stack's
// MongoDB directly and only when the stack signs in with the mock provider
// (JOURNEY_TEST_SIGN_IN=mock). It never runs against a deployed environment.
//
// The mock provider signs in one fixed person, so there is no second account:
// "a person who is not a Platform Admin" is the same person with the role taken
// away, which the backend reads from the person's record on every request.

const MOCK_USER_OID =
  process.env.JOURNEY_TEST_MOCK_OID || '11111111-1111-4111-8111-111111111111'
const PLATFORM_ADMIN_ROLE = 'platform-admin'
const MONGO_URI =
  process.env.JOURNEY_TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/'
// The backend's own default database; set when the backend is started with its own.
const MONGO_DATABASE =
  process.env.JOURNEY_TEST_MONGO_DATABASE || 'ai-platform-backend-api'
const SERVER_SELECTION_TIMEOUT_MS = 5000

export const TEAM_STATUSES = ['active', 'disabled', 'pending-removal']

export function isMockStack() {
  return process.env.JOURNEY_TEST_SIGN_IN === 'mock'
}

async function withDatabase(action) {
  if (!isMockStack()) {
    throw new Error(
      'Test data is set up directly in MongoDB only on the local stack: set JOURNEY_TEST_SIGN_IN=mock'
    )
  }

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS
  })

  try {
    await client.connect()

    return await action(client.db(MONGO_DATABASE))
  } finally {
    await client.close()
  }
}

/**
 * Whether the mock person has signed in to this stack before, which is what
 * creates their user record.
 * @returns {Promise<boolean>}
 */
export async function mockUserHasRecord() {
  const count = await withDatabase((db) =>
    db.collection('users').countDocuments({ oid: MOCK_USER_OID })
  )

  return count > 0
}

/**
 * Gives the mock person the Platform Admin role, or takes it away. The person
 * must have signed in once, so the record exists.
 * @param {boolean} isAdmin
 */
export async function setMockUserPlatformAdmin(isAdmin) {
  const { matchedCount } = await withDatabase((db) =>
    db
      .collection('users')
      .updateOne(
        { oid: MOCK_USER_OID },
        isAdmin
          ? { $addToSet: { roles: PLATFORM_ADMIN_ROLE } }
          : { $pull: { roles: PLATFORM_ADMIN_ROLE } }
      )
  )

  if (matchedCount !== 1) {
    throw new Error('The mock user has no record yet: sign in once first')
  }
}

/**
 * Sets a team's status, the way the Disable and Delete pages will once they
 * exist (`teams.status`).
 * @param {string} slug
 * @param {'active' | 'disabled' | 'pending-removal'} status
 */
export async function setTeamStatus(slug, status) {
  if (!TEAM_STATUSES.includes(status)) {
    throw new Error(`Unknown team status: ${status}`)
  }

  const { matchedCount } = await withDatabase((db) =>
    db.collection('teams').updateOne({ slug }, { $set: { status } })
  )

  if (matchedCount !== 1) {
    throw new Error(`No team with the slug ${slug}`)
  }
}
