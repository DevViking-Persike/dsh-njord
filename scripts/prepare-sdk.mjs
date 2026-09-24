/** Link development dependencies from one built Harness checkout. */
import { mkdir, realpath, symlink, lstat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'

const harness = resolve(process.argv[2] ?? '../deepseek-harness')
const require = createRequire(`${harness}/apps/cli/package.json`)
for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/schemastery',
  '@deepseek-ai/dsh-agent-presets', '@deepseek-ai/cordis-plugin-include', 'js-yaml']) {
  const source = await realpath(name === '@deepseek-ai/dsh-agent-presets'
    ? `${harness}/packages/preset/agent-presets`
    : dirname(require.resolve(`${name}/package.json`)))
  const target = resolve('node_modules', name)
  await mkdir(dirname(target), { recursive: true })
  try {
    await lstat(target)
    if (await realpath(target) !== source) throw new Error(`Refusing to replace ${target}`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await symlink(source, target, 'junction')
  }
}
