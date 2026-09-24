/** NJORD preset roots mounted through the upstream registry. */
import NjordPresets from './presets.js'
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
  ctx.plugin(NjordPresets, presetOptions(config))
}
