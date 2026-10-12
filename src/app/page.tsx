import type { Metadata } from 'next'
import Home from './HomeClient'

export const metadata: Metadata = {
  title: 'Example Content — Photo & Video Production Studio, Auckland NZ',
  description:
    'Example Content is an Auckland-based photo and video production studio specialising in architectural, commercial and event content across Auckland, Waikato and the Bay of Plenty — available nationwide.',
  alternates: { canonical: '/' },
}

export default function Page() {
  return <Home />
}
