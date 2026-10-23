import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mcp-handler imports redis/node builtins even when SSE is off.
  serverExternalPackages: ['mcp-handler', '@modelcontextprotocol/sdk', 'redis'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;
