/** @type {import('next').NextConfig} */

// Security headers applied to every route.
// Content-Security-Policy is handled dynamically in src/middleware.ts so that
// a per-request nonce can be used for inline scripts.
const securityHeaders = [
  // Allow DNS prefetching for performance.
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Prevent the page from being embedded in an iframe (clickjacking protection).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent browsers from guessing the MIME type (MIME sniffing protection).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit the referrer information sent to other sites.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unused browser features.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Enforce HTTPS for 2 years and include subdomains in the preload list.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  webpack(config, { dev }) {
    // Termux環境でのファイルシステムキャッシュエラーを抑制
    if (dev && process.platform === 'android') {
      config.cache = false;
    }

    // Webpack環境 (スマホ等) 向け: .svg を raw string として扱う
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

  // Turbopack向けの設定
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
};

export default nextConfig;