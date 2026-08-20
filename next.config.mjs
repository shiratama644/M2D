/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { dev }) {
    // Disable the filesystem cache on Termux to avoid FS cache errors.
    if (dev && process.platform === 'android') {
      config.cache = false;
    }

    // Webpack (phones / Termux): load .svg files as raw strings.
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

  // Turbopack equivalent of the SVG rule above.
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },

  images: {
    remotePatterns:[
      { protocol: 'https', hostname: 'cdn.modrinth.com' },
      { protocol: 'https', hostname: '*.modrinth.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};
export default nextConfig;
