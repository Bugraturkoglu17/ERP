/**
 * apps/frontend/next.config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Next.js Konfigürasyonu
 * @/ alias → src/ klasörüne yönlendirilir.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental:    { ppr: false },
  images:          { remotePatterns: [] },
  webpack(config) {
    // `@/` alias → `src/` klasörüne yönlendir
    config.resolve.alias["@"] = require("path").resolve(__dirname, "src");
    return config;
  },
};

module.exports = nextConfig;
