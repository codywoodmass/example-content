import type { Metadata } from 'next'
import WorkPage from './WorkClient'

const title = 'Our Work'
const description =
  "Browse Example Content's portfolio of architectural, commercial and event photography and video — real estate films, construction updates, brand content and event coverage from across New Zealand."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/work' },
  openGraph: { title, description, url: '/work' },
  twitter: { title, description },
}

export default function Page() {
  return <WorkPage />
}
