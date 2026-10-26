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
