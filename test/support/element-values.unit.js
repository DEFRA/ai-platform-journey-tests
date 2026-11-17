import assert from 'node:assert/strict'
import test from 'node:test'
import { forEachInOrder, readEach } from './element-values.js'

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

await test('forEachInOrder starts each action only once the one before has finished', async () => {
  const events = []
  const act = async (name) => {
    events.push(`start ${name}`)
    await new Promise((resolve) => setTimeout(resolve, name === 'one' ? 20 : 0))
    events.push(`end ${name}`)
  }

  await forEachInOrder(webdriverArray(['one', 'two']), act)

  assert.deepEqual(events, ['start one', 'end one', 'start two', 'end two'])
})

await test('forEachInOrder stops at a failure and runs nothing after it', async () => {
  const done = []
  const act = async (name) => {
    if (name === 'two') {
      throw new Error('two failed')
    }
    done.push(name)
  }

  await assert.rejects(
    forEachInOrder(['one', 'two', 'three'], act),
    /two failed/
  )
  assert.deepEqual(done, ['one'])
})
