/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
};

export default nextConfig;