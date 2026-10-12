import type { Metadata } from 'next'
import ContactPage from './ContactClient'

const title = 'Get In Touch'
const description =
  'Get in touch with Example Content to start your next photo or video project — based in Auckland, covering Auckland, Waikato and the Bay of Plenty, available nationwide.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/contact' },
  openGraph: { title, description, url: '/contact' },
  twitter: { title, description },
}

export default function Page() {
  return <ContactPage />
}
