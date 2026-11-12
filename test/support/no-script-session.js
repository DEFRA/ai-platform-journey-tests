import { browser } from '@wdio/globals'
import { remote } from 'webdriverio'

// Chrome setting that stops every page from running script, the way a person
// with script off (or a script that failed to load) sees the portal.
const SCRIPT_BLOCKED_PREFS = {
  'profile.managed_default_content_settings.javascript': 2
}

// Entra's sign-in page needs script, so the second session cannot sign in:
// it takes over the cookies of the one that did.
function cookiesToCarry(cookies) {
  return cookies.map(({ name, value, path, secure, httpOnly, sameSite }) => ({
    name,
    value,
    path,
    secure,
    httpOnly,
    sameSite
  }))
}

/**
 * Opens a second browser session with script switched off, signed in as the
 * person the current session is signed in as, and goes to `url`.
 * The caller must `await session.deleteSession()` when done.
 * @param {string} url - the address to open, absolute or relative to baseUrl
 * @returns {Promise<WebdriverIO.Browser>}
 */
export async function openWithoutScript(url) {
  const { hostname, port, protocol, path, baseUrl, user, key } = browser.options
  const requested = browser.requestedCapabilities ?? {}
  const chromeOptions = requested['goog:chromeOptions'] ?? {}
  const cookies = await browser.getCookies()

  const session = await remote({
    hostname,
    port,
    protocol,
    path,
    // A standalone session does not inherit the runner's credentials: on
    // BrowserStack the hub refuses it without them.
    ...(user && key && { user, key }),
    logLevel: 'error',
    capabilities: {
      browserName: 'chrome',
      ...(requested.proxy && { proxy: requested.proxy }),
      // BrowserStack's platform, build and local-testing choices.
      ...(requested['bstack:options'] && {
        'bstack:options': requested['bstack:options']
      }),
      'goog:chromeOptions': {
        args: chromeOptions.args ?? [],
        prefs: SCRIPT_BLOCKED_PREFS
      }
    }
  })

  try {
    // A cookie can only be set for the site the browser is on.
    await session.url(new URL('/', baseUrl).href)
    await session.setCookies(cookiesToCarry(cookies))
    await session.url(new URL(url, baseUrl).href)
  } catch (error) {
    await session.deleteSession()
    throw error
  }

  return session
}
