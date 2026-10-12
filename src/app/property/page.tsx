import type { Metadata } from 'next'
import PropertyPage from './PropertyClient'

const title = 'Property & Architectural Photography and Film'
const description =
  'High-end architectural and real estate photography and film for agents, builders and developers — bare land through construction to the completed property, shot sunrise to sunset across New Zealand.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/property' },
  openGraph: { title, description, url: '/property' },
  twitter: { title, description },
}

export default function Page() {
  return <PropertyPage />
}
