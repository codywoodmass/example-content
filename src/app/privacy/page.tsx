import type { Metadata } from 'next'
import PrivacyPage from './PrivacyClient'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: "Example Content's privacy policy — what information we collect through this website and how we use it.",
  alternates: { canonical: '/privacy' },
}

export default function Page() {
  return <PrivacyPage />
}
