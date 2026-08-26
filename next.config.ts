import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'videos.pexels.com' },
      { protocol: 'https', hostname: '**.pexels.com' },
      { protocol: 'https', hostname: 'nomade-nation.com' },
      { protocol: 'https', hostname: 'www.utopiavanlife.com' }
    ],
  },
};

export default withNextIntl(nextConfig);

