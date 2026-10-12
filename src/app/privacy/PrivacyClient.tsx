'use client'
import React from 'react'
import SiteNav from '@/components/public/SiteNav'
import LogoWatermark from '@/components/public/LogoWatermark'
import SiteFooter from '@/components/public/SiteFooter'

const h2Style: React.CSSProperties = { fontSize: 'clamp(18px, 2.4vw, 22px)', fontWeight: 400, color: '#fff', margin: '40px 0 14px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.01em' }
const pStyle: React.CSSProperties = { fontSize: 14, color: 'rgba(200,194,187,0.6)', lineHeight: 1.8, margin: '0 0 12px' }

export default function PrivacyPage() {

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <LogoWatermark />
      <SiteNav />

      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(60px, 10vw, 100px)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 16 }}>Legal</p>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 400, lineHeight: 1.02, letterSpacing: '0.01em', color: '#fff', margin: '0 0 24px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>
            Privacy Policy
          </h1>
          <p style={pStyle}>Last updated: October 2026. Example Content Ltd ("we", "us") respects your privacy. This page explains what personal information we collect through this website and what we do with it.</p>

          <h2 style={h2Style}>What we collect</h2>
          <p style={pStyle}>When you use our contact form or request a booking, we collect the information you give us directly — typically your name, email address, phone number and the details of your enquiry or project.</p>

          <h2 style={h2Style}>How we use it</h2>
          <p style={pStyle}>We use this information only to respond to your enquiry, schedule and manage a shoot, and deliver the services you've asked us for. We don't sell your information, and we don't use it for advertising.</p>

          <h2 style={h2Style}>Where it's stored</h2>
          <p style={pStyle}>Enquiries and booking details are stored in our studio database (Supabase) and emailed to us via our email provider (Resend). Both are reputable third-party processors used only to run this website and our studio operations — they don't use your information for their own purposes.</p>

          <h2 style={h2Style}>Cookies</h2>
          <p style={pStyle}>This site uses a small number of functional cookies — for example, to keep you signed in to your client or studio portal. We don't use third-party advertising or tracking cookies.</p>

          <h2 style={h2Style}>Your rights</h2>
          <p style={pStyle}>Under the Privacy Act 2020 (New Zealand), you can ask us what personal information we hold about you, and ask us to correct or delete it. To do so, email us at <a href="mailto:cody@examplecontent.co.nz" style={{ color: '#C8C2BB' }}>cody@examplecontent.co.nz</a>.</p>

          <h2 style={h2Style}>Contact</h2>
          <p style={pStyle}>Questions about this policy can be sent to <a href="mailto:cody@examplecontent.co.nz" style={{ color: '#C8C2BB' }}>cody@examplecontent.co.nz</a>.</p>
        </div>
      </div>

      <SiteFooter />
    </main>
  )
}
