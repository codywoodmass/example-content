import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examplecontent.co.nz'

// Just the public marketing pages — the portal, auth and shareable
// private-link routes are excluded here the same way they're excluded
// in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/work', '/property', '/services', '/about', '/contact', '/privacy']
  const now = new Date()
  return routes.map(route => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))
}
