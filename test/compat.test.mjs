import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const CLIENT = new URL('../lib/client.js', import.meta.url)

/** Load the client bundle in a sandbox and return its exports. */
function loadClient(cryptoValue) {
  const sandbox = { crypto: cryptoValue, Uint8Array }
  const window = { __ModuleLoader__: { load: (entry) => { sandbox.entry = entry } } }
  sandbox.window = window
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(readFileSync(CLIENT, 'utf8'), sandbox)
  return sandbox.entry.factory()
}

/** A crypto stand-in without `randomUUID`, the way an insecure origin exposes it. */
function insecureCrypto() {
  const host = { getRandomValues: (bytes) => { for (let index = 0; index < bytes.length; index += 1) bytes[index] = (index * 37 + 11) & 0xff; return bytes } }
  return { host, page: Object.create(host) }
}

test('defines randomUUID when the origin withholds it', () => {
  const { page } = insecureCrypto()
  const client = loadClient(page)
  const dispose = client.installCryptoRandomUUID(page)
  assert.equal(typeof page.randomUUID, 'function')
  assert.match(page.randomUUID(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  dispose()
  assert.equal(page.randomUUID, undefined)
})

test('leaves a native implementation untouched and does not remove it on disposal', () => {
  const native = function nativeRandomUUID() { return 'native' }
  const page = Object.create({ getRandomValues: () => new Uint8Array(16) })
  page.randomUUID = native
  const client = loadClient(page)
  const dispose = client.installCryptoRandomUUID(page)
  assert.equal(page.randomUUID, native)
  dispose()
  assert.equal(page.randomUUID, native)
})

test('apply installs the polyfill through the client effect', () => {
  const { page } = insecureCrypto()
  const client = loadClient(page)
  const disposers = []
  const ctx = { effect: (register) => { disposers.push(register()) } }
  client.apply(ctx)
  assert.equal(typeof page.randomUUID, 'function')
  assert.equal(disposers.length, 1)
  disposers[0]()
  assert.equal(page.randomUUID, undefined)
})
