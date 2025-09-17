/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 👉 Jangan jalankan ESLint saat production build
    ignoreDuringBuilds: true,
  },
  // OPTIONAL: kalau TypeScript juga sering nge-block build
  // typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
