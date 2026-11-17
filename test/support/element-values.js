/**
 * Reads one value from every element in a list the browser found.
 *
 * `getElements()` hands back WebdriverIO's own array, whose `map()` is
 * asynchronous and returns a promise, so it cannot be fed to `Promise.all()`.
 * `Array.from` walks it with the standard array behaviour instead.
 * @template T
 * @param {ArrayLike<WebdriverIO.Element>} elements
 * @param {(element: WebdriverIO.Element) => Promise<T>} read
 * @returns {Promise<T[]>}
 */
export function readEach(elements, read) {
  return Promise.all(Array.from(elements, (element) => read(element)))
}

/**
 * Runs a browser action on each item one after another, in order, each
 * starting once the one before has finished: for clicks and choices on the
 * page. Reads that change nothing use `readEach`, which runs them together.
 * @template T
 * @param {Iterable<T>} items
 * @param {(item: T) => Promise<unknown>} act
 * @returns {Promise<void>}
 */
export async function forEachInOrder(items, act) {
  await Array.from(items).reduce(
    (previous, item) => previous.then(() => act(item)),
    Promise.resolve()
  )
}
