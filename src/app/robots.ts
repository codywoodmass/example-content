import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examplecontent.co.nz'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Client/studio portal, auth and shareable private-link pages —
      // none of these are meant to show up in search results.
      disallow: ['/portal', '/studio', '/login', '/signup', '/reset-password', '/brief', '/view', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
