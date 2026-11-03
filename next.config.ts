import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Todos os dados são por usuário e dependem da sessão: renderização dinâmica é o padrão.
  cacheComponents: false,
  serverExternalPackages: ["mongoose", "@node-rs/argon2"],
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
