/** NJORD preset roots mounted through the upstream registry. */
import AgentPresets from '@deepseek-ai/dsh-agent-presets'
import z from '@deepseek-ai/schemastery'
import { presetOptions } from './preset-options.js'

export const name = 'njord-presets'
export const Config = z.object({
  default: z.string().default('njord-code'),
  roots: z.array(z.object({
    path: z.string().required(),
    trust: z.union(['system', 'user']).default('user'),
  })).default([]),
})

/** Mount the upstream engine with the additional NJORD configurations. */
export function apply(ctx, config) {
  ctx.plugin(AgentPresets, presetOptions(config))
}
