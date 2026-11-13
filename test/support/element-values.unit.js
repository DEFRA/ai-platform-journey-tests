import assert from 'node:assert/strict'
import test from 'node:test'
import { readEach } from './element-values.js'

// Behaves like the array WebdriverIO's `getElements()` returns: its `map()`
// is asynchronous and hands back a promise, not an array.
function webdriverArray(items) {
  const elements = [...items]
  elements.map = async (callback) => Promise.all(items.map(callback))
  return elements
}

await test('readEach returns the values as a real array, in order', async () => {
  const elements = webdriverArray([
    { getText: async () => 'one' },
    { getText: async () => 'two' }
  ])

  const values = await readEach(elements, (element) => element.getText())

  assert.ok(Array.isArray(values))
  assert.deepEqual(values, ['one', 'two'])
})

await test('readEach returns an empty array when nothing was found', async () => {
  const values = await readEach(webdriverArray([]), (element) =>
    element.getText()
  )

  assert.deepEqual(values, [])
})
