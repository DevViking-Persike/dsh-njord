import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdir } from 'node:fs/promises'
import { presetOptions } from '../src/preset-options.js'

test('ships one NJORD composition', async () => {
  assert.deepEqual(await readdir(new URL('../presets/', import.meta.url)), ['njord-code'])
})

test('the SDK resolves saved PTC sessions to Code while showing only Code', {
  skip: !process.env.DSH_TEST_HARNESS_ROOT,
}, async () => {
  const require = createRequire(import.meta.resolve('@deepseek-ai/dsh-agent-presets'))
  const load = name => import(pathToFileURL(require.resolve(name)).href)
  const { Context } = await load('@deepseek-ai/cordis')
  const { default: Loader } = await load('@deepseek-ai/cordis-plugin-loader')
  const { default: Projections } = await load('@deepseek-ai/dsh-session-projection')
  const { remoteMethods } = await load('@deepseek-ai/dsh-typert-protocol')
  const { default: NjordPresets } = await import('../src/presets.js')
  const ctx = new Context()
  ctx.baseUrl = pathToFileURL(`${process.env.DSH_TEST_HARNESS_ROOT}/apps/cli/package.json`).href
  try {
    await ctx.plugin(Loader)
    await ctx.plugin(Projections)
    await ctx.plugin(NjordPresets, {
      ...presetOptions({ default: 'njord-ptc' }), includeUserRoot: false,
    })
    const presets = ctx.agentPresets
    const roster = await presets.remoteExportList()
    assert.deepEqual(roster.presets.filter(row => row.id.startsWith('njord-')).map(row => row.id), ['njord-code'])
    assert.equal(roster.presets.find(row => row.id === 'njord-code').isDefault, true)
    assert.equal(presets.defaultId, 'njord-code')
    assert.equal((await presets.resolve()).id, 'njord-code')
    const legacy = await presets.resolve('njord-ptc')
    const code = await presets.resolve('njord-code')
    assert.equal(legacy.id, 'njord-ptc')
    assert.equal(legacy.path, code.path)
    assert.equal(legacy.broken, undefined)
    assert.equal(await presets.read('njord-ptc'), await presets.read('njord-code'))
    assert.equal((await presets.resolve('ptc')).id, 'ptc')
    assert.equal((await presets.resolve('standard')).id, 'standard')
    assert.ok(remoteMethods(presets).some(row => row.exportName === 'list'))
    await assert.rejects(presets.resolve('nonexistent'), /not found/)
  } finally {
    await ctx.fiber.dispose()
  }
})
