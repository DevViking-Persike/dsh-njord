import { fileURLToPath } from 'node:url'

/** Build the configuration for the upstream preset registry. */
export function presetOptions(config) {
  return {
    default: config.default,
    roots: [
      { path: fileURLToPath(new URL('../presets/', import.meta.url)), trust: 'system' },
      ...(config.roots ?? []),
    ],
    includeShippedRoot: true,
    includeUserRoot: true,
  }
}
