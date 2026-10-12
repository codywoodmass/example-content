import type { Metadata } from 'next'
import ServicesPage from './ServicesClient'

const title = 'Our Services'
const description =
  'Property and real estate film, architectural photography, brand and commercial video, social content, event coverage and development campaigns — full-service photo and video production from Example Content.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/services' },
  openGraph: { title, description, url: '/services' },
  twitter: { title, description },
}

export default function Page() {
  return <ServicesPage />
}
