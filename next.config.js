const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} = require('next/constants')

module.exports = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER
  // isProd has no config branch of its own - it's the implicit default whenever
  // neither of the other two applies - but stays in the log for deploy visibility.
  // No phase check on STAGING. headers() is evaluated outside PHASE_PRODUCTION_BUILD
  // too, and gating on the build phase meant STAGING=1 set in pm2's env or in .env
  // after the build produced no X-Robots-Tag at all - while robots.txt, which reads
  // the same variable with no phase check, still said Disallow. The two could
  // therefore disagree with nothing to warn you.
  const isStaging = process.env.STAGING === '1'
  const isProd = phase === PHASE_PRODUCTION_BUILD && !isStaging

  console.log(`isDev:${isDev}  isProd:${isProd}   isStaging:${isStaging}`)

  const env = {
    // 4502 is the port ecosystem.config.js starts this app on. The old 3100 was
    // left over from the previous Express app, and because this env block is
    // INLINED at build time it also overrode restClient.ts's own correct fallback -
    // so a deploy that forgot APP_API sent every server-side API call to a closed
    // port, first visible as a 500 on the page right after payment.
    APP_API: process.env.APP_API || 'http://localhost:4502/api',
    REACT_APP_API: '/api'
  }

  // Not nonce-based: the Pages Router's next/script usage and the JSON-LD
  // <script> tags scattered through pages/ all rely on inline content, and a
  // strict per-request nonce would need middleware plus rewiring every one of
  // those call sites. 'unsafe-inline' still keeps the CSP's main real-world
  // value - blocking script/frame/connect requests to attacker-controlled
  // domains - just not inline-payload XSS specifically.
  // The browser fetches Strapi directly for the nav menu and the whole footer, so
  // its origin must be in the CSP. Hardcoding one hostname meant any other
  // environment - a staging Strapi, or the old onrender host that next.config still
  // trusts for images - rendered the site with an empty menu and no footer, with
  // only a console error to show for it.
  const strapiOrigin = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337').origin
    } catch {
      return 'http://localhost:1337'
    }
  })()

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://c.seznam.cz`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://*.pellwood.com ${strapiOrigin} https://*.zbozi.cz https://www.googletagmanager.com https://www.google-analytics.com https://*.seznam.cz${isDev ? ' http://localhost:1337' : ''}`,
    `connect-src 'self' https://*.pellwood.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.seznam.cz https://*.zbozi.cz ${strapiOrigin}${isDev ? ' http://localhost:1337 ws://localhost:*' : ''}`,
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
    poweredByHeader: false,
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
        { protocol: 'https', hostname: 'pawdlzmdumjinndgowct.supabase.co' },
        { protocol: 'https', hostname: 'pellwood-strapi.onrender.com' },
        { protocol: 'https', hostname: 'pellwood-strapi.hardart.cz' },
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
