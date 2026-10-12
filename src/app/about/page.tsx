import type { Metadata } from 'next'
import AboutPage from './AboutClient'

const title = 'About Us'
const description =
  'Meet the team behind Example Content, an Auckland-based photo and video production studio working across architecture, lifestyle, brand and events.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/about' },
  openGraph: { title, description, url: '/about' },
  twitter: { title, description },
}

export default function Page() {
  return <AboutPage />
}
