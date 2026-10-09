import nextConfig from "eslint-config-next"

// Flat ESLint config — eslint-config-next@16 ships a flat array export.
// Restores `bun run lint` (the script was failing with "couldn't find an
// eslint.config.(js|mjs|cjs) file" before this file existed).
const eslintConfig = [
  ...nextConfig,
]

export default eslintConfig
