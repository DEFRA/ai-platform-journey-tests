import { browser, $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// Drives the real Entra ID hosted login form - only works against a deployed
// environment with a real tenant; requires a dedicated test account (no MFA).
//
// With JOURNEY_TEST_SIGN_IN=mock it instead follows the frontend's mock OIDC
// provider (npm run dev:mock-oidc in ai-platform-frontend), which approves the
// one fixed mock user at once and shows no form. Local runs against a stack
// started with OIDC_MOCK_ISSUER_URL use this; deployed environments never do.
class SignInPage extends Page {
  get signOutButton() {
    return $('.app-sign-in-out__button')
  }

  get emailField() {
    return $('input[name="loginfmt"]')
  }

  get emailSubmit() {
    return $('input[type="submit"]')
  }

  get passwordField() {
    return $('input[name="passwd"]')
  }

  get passwordSubmit() {
    return $('input[type="submit"]')
  }

  get staySignedInNo() {
    return $('input[value="No"]')
  }

  async signIn() {
    if (process.env.JOURNEY_TEST_SIGN_IN === 'mock') {
      return this.signInWithMockProvider()
    }

    return this.signInWithEntra()
  }

  async signInWithMockProvider() {
    await super.open('/sign-in')

    await this.signOutButton.waitForDisplayed({
      timeout: 15000,
      timeoutMsg: 'Expected the mock provider to sign the user in'
    })
  }

  async signInWithEntra() {
    const email = process.env.JOURNEY_TEST_USER_EMAIL
    const password = process.env.JOURNEY_TEST_USER_PASSWORD

    if (!email || !password) {
      throw new Error(
        'JOURNEY_TEST_USER_EMAIL and JOURNEY_TEST_USER_PASSWORD must be set to run post-signin journey tests'
      )
    }

    await super.open('/sign-in')

    await this.emailField.waitForDisplayed()
    await this.emailField.setValue(email)
    await this.emailSubmit.click()

    await this.passwordField.waitForDisplayed()
    await this.passwordField.setValue(password)
    await this.passwordSubmit.click()

    if (await this.staySignedInNo.isDisplayed().catch(() => false)) {
      await this.staySignedInNo.click()
    }

    await browser.waitUntil(
      async () =>
        !(await browser.getUrl()).includes('login.microsoftonline.com'),
      {
        timeout: 15000,
        timeoutMsg:
          'Expected to be redirected back to the frontend after sign-in'
      }
    )
  }
}

export default new SignInPage()
