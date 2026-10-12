import { browser, $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// Drives the real Entra ID hosted login form - only works against a deployed
// environment with a real tenant; requires a dedicated test account (no MFA).
class SignInPage extends Page {
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
