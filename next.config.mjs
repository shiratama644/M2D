/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Handle *.svg imports as raw strings so the Icon component can render them inline.
    // Find any existing rule that would claim .svg files and exclude them so our rule wins.
    config.module.rules.forEach((rule) => {
      if (rule.test instanceof RegExp && rule.test.test('.svg')) {
        rule.exclude = /\.svg$/i;
      }
      if (Array.isArray(rule.oneOf)) {
        rule.oneOf.forEach((sub) => {
          if (sub.test instanceof RegExp && sub.test.test('.svg')) {
            sub.exclude = /\.svg$/i;
          }
        });
      }
    });

    config.module.rules.push({
      test: /\.svg$/i,
      type: 'asset/source',
    });

    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.modrinth.com' },
      { protocol: 'https', hostname: '*.modrinth.com' },
    ],
  },
};

export default nextConfig;
