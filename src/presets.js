/** One Code composition, with the previous PTC id retained for saved sessions. */
import AgentPresets from '@deepseek-ai/dsh-agent-presets'

const CODE = 'njord-code'
const LEGACY_PTC = 'njord-ptc'

/** Keep the legacy identity resolvable without offering a second NJORD mode. */
export default class NjordPresets extends AgentPresets {
  /** @returns Discovered presets and the legacy id sharing Code's composition. */
  async list() {
    const presets = (await super.list()).filter(preset => preset.id !== LEGACY_PTC)
    const code = presets.find(preset => preset.id === CODE)
    return code === undefined ? presets : [...presets, { ...code, id: LEGACY_PTC }]
  }

  /** @returns Code for a saved legacy default, or the operator's other choice. */
  get defaultId() {
    const id = super.defaultId
    return id === LEGACY_PTC ? CODE : id
  }

  /** @returns The selectable roster; saved sessions still resolve the legacy id. */
  async remoteExportList() {
    const roster = await super.remoteExportList()
    const legacyDefault = roster.presets.some(preset => preset.id === LEGACY_PTC && preset.isDefault)
    return {
      ...roster,
      presets: roster.presets.filter(preset => preset.id !== LEGACY_PTC).map(preset => ({
        ...preset,
        isDefault: preset.isDefault || (legacyDefault && preset.id === CODE),
      })),
    }
  }
}
