const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} = require('next/constants')

module.exports = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER
  // isProd has no config branch of its own - it's the implicit default whenever
  // neither of the other two applies - but stays in the log for deploy visibility.
  const isProd = phase === PHASE_PRODUCTION_BUILD && process.env.STAGING !== '1'
  const isStaging = phase === PHASE_PRODUCTION_BUILD && process.env.STAGING === '1'

  console.log(`isDev:${isDev}  isProd:${isProd}   isStaging:${isStaging}`)

  const env = {
    APP_API: process.env.APP_API || 'http://localhost:3001/api',
    REACT_APP_API: '/api'
  }

  // Not nonce-based: the Pages Router's next/script usage and the JSON-LD
  // <script> tags scattered through pages/ all rely on inline content, and a
  // strict per-request nonce would need middleware plus rewiring every one of
  // those call sites. 'unsafe-inline' still keeps the CSP's main real-world
  // value - blocking script/frame/connect requests to attacker-controlled
  // domains - just not inline-payload XSS specifically.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://c.seznam.cz",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://*.pellwood.com${isDev ? ' http://localhost:1337' : ''}`,
    "font-src 'self' data:",
    `connect-src 'self' https://*.pellwood.com https://*.google-analytics.com https://*.analytics.google.com https://*.seznam.cz${isDev ? ' http://localhost:1337 ws://localhost:*' : ''}`,
    "frame-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')

  const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: csp },
    // The one place isStaging is actually load-bearing rather than just logged -
    // a staging deploy must never get indexed alongside the real site.
    ...(isStaging ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : []),
  ]

  return {
    env,
    i18n: {
      locales: ['cs', 'en'],
      defaultLocale: 'cs',
      localeDetection: false,
    },
    images: {
      // Local IPs/localhost images are a dev-only convenience (Strapi running on
      // localhost:1337 during local work) - there's no legitimate reason for a
      // production or staging deploy to fetch/optimize an image from a local or
      // internal address.
      ...(isDev ? { dangerouslyAllowLocalIP: true } : {}),
      remotePatterns: [
        ...(isDev ? [{ protocol: 'http', hostname: 'localhost' }] : []),
        {
          protocol: 'https',
          hostname: '**.pellwood.com',
        },
        { protocol: 'https', hostname: 'pawdlzmdumjinndgowct.storage.supabase.co' },
        { protocol: 'https', hostname: 'pellwood-strapi.onrender.com' },
        { protocol: 'http', hostname: 'localhost', port: '1337' },
      ],
    },
    async headers() {
      return [
        {
          source: '/:path*',
          headers: securityHeaders,
        },
      ]
    },
    sassOptions: {
      quietDeps: true,
      silenceDeprecations: ['import', 'color-functions', 'global-builtin', 'slash-div'],
    }
  }
}
