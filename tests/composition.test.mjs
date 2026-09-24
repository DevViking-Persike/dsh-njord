import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { presetOptions } from '../src/preset-options.js'

const require = createRequire(import.meta.url)
const yaml = require('js-yaml')
const { applyEntryPatches, entryListSchema } = require('@deepseek-ai/cordis-plugin-include')
const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const parse = path => yaml.load(read(path), { schema: entryListSchema })
const patch = parse('cordis.patch.yml')
const manifest = JSON.parse(read('package.json'))
const pins = JSON.parse(read('install-pins.json'))
const flatten = rows => rows.flatMap(row => [row, ...(row.group ? flatten(row.config) : [])])
const inserted = patch.flatMap(row => row.insert ?? [])

// Exercise DSH's patch algorithm against a base with no legacy NJORD rows.
test('replaces the upstream preset registry without requiring removed rows', () => {
  const originals = patch.filter(row => row.id).map(row => ({
    id: row.id, name: `old:${row.id}`, config: { credentialRef: `stored:${row.id}` },
  }))
  originals.push({ id: 'unrelated', name: 'custom-plugin', config: { enabled: true } })
  const warnings = []
  const result = applyEntryPatches(originals, patch, (...args) => warnings.push(args))
  assert.deepEqual(warnings, [])
  for (const old of originals.slice(0, -1)) {
    const next = result.find(row => row.id === old.id)
    assert.equal(next.disabled, true)
    assert.deepEqual(next.config, old.config)
  }
  assert.deepEqual(result.find(row => row.id === 'unrelated'), originals.at(-1))
  const ids = result.map(row => row.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(inserted.map(row => row.name)).size, inserted.length)
})

test('mounts every dependency explicitly and declares only one preset engine', () => {
  for (const row of inserted) {
    const packageName = row.name.startsWith('@') ? row.name.split('/').slice(0, 2).join('/') : row.name
    assert.ok(packageName === manifest.name || manifest.peerDependencies[packageName], packageName)
  }
  assert.equal(inserted.filter(row => row.name === manifest.name).length, 1)
  for (const [name, spec] of Object.entries(pins)) {
    assert.equal(manifest.peerDependencies[name], '0.1.0')
    assert.notEqual(manifest.peerDependenciesMeta?.[name]?.optional, true)
    assert.match(spec, /^github:DevViking-Persike\/[^#]+#[0-9a-f]{40}$/)
    assert.ok(read('README.md').includes(spec), name)
  }
  for (const dependencies of [manifest.dependencies, manifest.optionalDependencies, manifest.peerDependencies]) {
    for (const spec of Object.values(dependencies ?? {})) {
      assert.doesNotMatch(spec, /^(?:git(?:\+|:)|github:|https?:|file:|link:)/)
    }
  }
  assert.equal(manifest.bin, undefined)
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-agent-presets'], '0.1.6-alpha.2')
  assert.ok(!Object.keys(manifest.peerDependencies).some(name => name.includes('session-coordination')))
})

test('CLIProxy owns Gemini only and gets endpoint and key from the user environment', () => {
  const proxy = inserted.find(row => row.id === 'dsh-cliproxy')
  assert.deepEqual(proxy.config.routes, ['gemini'])
  assert.equal(proxy.config.readLocalProxyKey, false)
  assert.equal(proxy.config.apiKeyEnv, 'CLIPROXY_API_KEY')
  for (const [env, disabled] of [[{}, true], [{ DSH_NJORD_CLIPROXY_BASE_URL: 'http://localhost:8317/v1' }, false]]) {
    assert.equal(runInNewContext(proxy.disabled.__jsExpr, { process: { env } }), disabled)
    assert.equal(runInNewContext(proxy.config.baseURL.__jsExpr, { process: { env } }), env.DSH_NJORD_CLIPROXY_BASE_URL)
  }
  assert.deepEqual(inserted.find(row => row.id === 'dsh-subscriptions').config.routes, ['claude', 'codex'])
})

for (const [preset, mode] of [['njord-code', 'both'], ['njord-ptc', 'ptc']]) {
  test(`${preset} enables workflow with one upstream presentation and no host engines`, () => {
    const data = parse(`presets/${preset}/agent.cordis.yml`)
    const all = flatten(data)
    assert.equal(new Set(all.map(row => row.id)).size, all.length)
    const presentation = all.filter(row => row.id === 'tool-presentation')
    assert.equal(presentation.length, 1)
    assert.equal(presentation[0].config.mode, mode)
    const delegation = data.find(row => row.id === 'delegation')
    assert.equal(delegation.isolate.workflowEngine, true)
    for (const id of ['workflow-ptc', 'tool-workflow']) {
      assert.notEqual(delegation.config.find(row => row.id === id).disabled, true)
    }
    assert.equal(all.some(row => /(?:ptc-runtime-node|agent-loop|dsh-treadmill|dsh-tools)$/.test(row.name)), false)
    assert.ok(all.every(row => row.name.startsWith('@deepseek-ai/') || row.name === 'cordis:group'))
    assert.ok(parse(`presets/${preset}/preset.yml`).description)
  })
}

test('adds portable preset roots while preserving shipped and user presets', () => {
  const extra = { path: '/operator/presets', trust: 'user' }
  const options = presetOptions({ default: 'njord-code', roots: [extra] })
  assert.equal(options.roots[0].path, fileURLToPath(new URL('presets/', root)))
  assert.deepEqual(options.roots[1], extra)
  assert.equal(options.includeShippedRoot, true)
  assert.equal(options.includeUserRoot, true)
})

test('composes after the actual Harness base and web bundles', { skip: !process.env.DSH_TEST_HARNESS_ROOT }, () => {
  const harness = process.env.DSH_TEST_HARNESS_ROOT
  const load = path => yaml.load(readFileSync(`${harness}/${path}`, 'utf8'), { schema: entryListSchema })
  const warnings = []
  const result = applyEntryPatches([], [
    ...load('packages/bundle/base/cordis.patch.yml'),
    ...load('packages/bundle/web-app/cordis.patch.yml'),
    ...patch,
  ], (...args) => warnings.push(args))
  const all = flatten(result)
  assert.equal(new Set(all.map(row => row.id)).size, all.length)
  for (const row of inserted) assert.equal(all.filter(entry => entry.id === row.id).length, 1)
  for (const legacy of patch.filter(row => row.id)) {
    const found = all.find(row => row.id === legacy.id)
    if (found) assert.equal(found.disabled, true, legacy.id)
  }
  assert.deepEqual(warnings, [])
  const retired = ['docker', 'docker-local', 'tool-docker', 'treadmill', 'project-controller',
    'ui-docker', 'ui-treadmill', 'ui-knowledge', 'llm-claude-code', 'llm-codex', 'llm-cliproxy']
  assert.deepEqual(all.filter(row => retired.includes(row.id) && row.disabled !== true).map(row => row.id), [],
    'Remove or disable legacy NJORD entries before activating the aggregate bundle')
})


test('keeps personal provider patches addressable through their original IDs', () => {
  const personalConfig = { routes: ['claude'], claudeCredentialPath: '/operator/credentials/claude.json' }
  const warnings = []
  const rows = applyEntryPatches([{ id: 'agent-presets', name: 'upstream-presets' }], [
    ...patch, { id: 'dsh-subscriptions', config: personalConfig },
  ], (...args) => warnings.push(args))
  assert.deepEqual(warnings, [])
  assert.deepEqual(rows.find(row => row.id === 'dsh-subscriptions').config, personalConfig)
  assert.equal(rows.filter(row => row.name === 'dsh-subscriptions').length, 1)
})
