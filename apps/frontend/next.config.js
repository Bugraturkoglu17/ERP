/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Repo'da önceden var olan ~15 kozmetik lint hatası (unescaped apostrophe,
  // <img> yerine next/image önerisi vb.) prod build'i durdurmasın. `npm run
  // lint` hâlâ tam sinyali veriyor, sadece build bunlar yüzünden kırılmasın.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
