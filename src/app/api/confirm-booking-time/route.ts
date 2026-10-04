import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatTime12, nzOffset } from '@/lib/time'
import { getGoogleClients } from '@/lib/google'

const STUDIO_EMAIL = 'cody@examplecontent.co.nz'

// The client accepting a proposed time happens in the client's browser, but
// since the Google connection lives in the database (not a browser cookie —
// see src/lib/google.ts), this route can still create the Drive folder and
// calendar event itself, synchronously, with no dependency on the studio
// ever opening their own dashboard.
export async function POST(req: NextRequest) {
  const { bookingId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: booking, error: bookingError } = await admin.from('bookings1').select('*').eq('id', bookingId).maybeSingle()
  if (bookingError || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'date_proposed') return NextResponse.json({ error: 'Booking is not awaiting confirmation' }, { status: 409 })

  const { data: project, error: projectError } = await admin.from('projects1').insert([{
    title: booking.address || booking.shoot_package || 'New project',
    client: booking.client_name || booking.client_email || '',
    contact: booking.client_name || '',
    email: booking.client_email || '',
    category: booking.category === 'property' ? 'Property' : 'Commercial',
    address: booking.address || '',
    stage: 'Enquiry',
    shoot_date: booking.proposed_date || null,
    shoot_window_start: booking.proposed_date ? (booking.proposed_start_time || null) : null,
    shoot_window_end: booking.proposed_date ? (booking.proposed_end_time || null) : null,
    draft_due: booking.draft_due || null,
    delivery_due: booking.delivery_due || null,
    progress: 0,
    from_booking: true,
    general_notes: booking.notes || '',
    editor_notes: '',
    amount: booking.total_price ?? null,
    attachment_urls: booking.attachment_urls || [],
    deliverables: [
      booking.shoot_package ? 'PACKAGE: ' + booking.shoot_package : '',
      booking.deliverables ? 'DELIVERABLES: ' + booking.deliverables : '',
      booking.addons ? 'ADD-ONS: ' + booking.addons : '',
    ].filter(Boolean).join('\n'),
  }]).select().single()
  if (projectError || !project) return NextResponse.json({ error: projectError?.message || 'Project creation failed' }, { status: 500 })

  await admin.from('bookings1').update({ status: 'confirmed', project_id: project.id }).eq('id', bookingId)

  const dateLabel = booking.proposed_date ? new Date(`${booking.proposed_date}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' }) : null
  const timeLabel = booking.proposed_start_time ? formatTime12(booking.proposed_start_time) : null
  const projectUrl = new URL(`/portal/studio/projects?open=${project.id}`, req.nextUrl.origin).toString()

  // Create the Drive folder (reuses the existing folder-matching logic via
  // an internal call rather than duplicating it) and attach it to the project.
  let driveUrl: string | null = null
  try {
    const driveRes = await fetch(new URL('/api/drive/folder', req.nextUrl.origin).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: booking.category, client: project.client, projectTitle: project.title }),
    })
    const driveData = await driveRes.json()
    if (driveData.url) {
      driveUrl = driveData.url
      await admin.from('projects1').update({ drive_url: driveData.url }).eq('id', project.id)
    }
  } catch (e) { console.error('Drive folder creation error:', e) }

  // Create the calendar event for the confirmed shoot time.
  if (booking.proposed_date && booking.proposed_start_time && booking.proposed_end_time) {
    try {
      const clients = await getGoogleClients()
      if (clients) {
        const event = await clients.calendar.events.insert({
          calendarId: 'primary',
          sendUpdates: 'all',
          requestBody: {
            summary: `Example Content — ${project.title}`,
            location: project.address || '',
            description: `Confirmed shoot for ${booking.client_name || booking.client_email}\nPackage: ${booking.shoot_package || ''}\nDeliverables: ${booking.deliverables || ''}`,
            start: { dateTime: new Date(`${booking.proposed_date}T${booking.proposed_start_time}:00${nzOffset(booking.proposed_date)}`).toISOString(), timeZone: 'Pacific/Auckland' },
            end: { dateTime: new Date(`${booking.proposed_date}T${booking.proposed_end_time}:00${nzOffset(booking.proposed_date)}`).toISOString(), timeZone: 'Pacific/Auckland' },
            attendees: [
              { email: STUDIO_EMAIL, displayName: 'Example Content' },
              ...(booking.client_email ? [{ email: booking.client_email, displayName: 'Client' }] : []),
            ],
          },
        })
        if (event.data.id) await admin.from('projects1').update({ calendar_event_id: event.data.id }).eq('id', project.id)
      }
    } catch (e) { console.error('Calendar event creation error:', e) }
  }

  try {
    await admin.from('notifications').insert([{
      user_email: STUDIO_EMAIL,
      type: 'time_confirmed',
      title: 'Project created — client confirmed',
      message: `${booking.client_name || booking.client_email} confirmed ${dateLabel || 'the proposed time'}${timeLabel ? ' at ' + timeLabel : ''} for ${project.title}. Project created.`,
      project_id: project.id,
      read: false,
    }])
  } catch (e) { console.error('Notification insert error:', e) }

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
          to: STUDIO_EMAIL,
          subject: `Project created — ${project.title}`,
          html: `
            <p><strong>${booking.client_name || booking.client_email}</strong> (${booking.client_email}) confirmed ${dateLabel ? '<strong>' + dateLabel + '</strong>' : 'the proposed time'}${timeLabel ? ' at <strong>' + timeLabel + '</strong>' : ''}.</p>
            <p>A project has automatically been created:</p>
            <ul>
              <li><strong>Title:</strong> ${project.title}</li>
              <li><strong>Client:</strong> ${project.client}</li>
              ${project.address ? `<li><strong>Address:</strong> ${project.address}</li>` : ''}
              <li><strong>Category:</strong> ${project.category}</li>
              ${booking.shoot_package ? `<li><strong>Package:</strong> ${booking.shoot_package}</li>` : ''}
              ${booking.addons ? `<li><strong>Add-ons:</strong> ${booking.addons}</li>` : ''}
              ${project.amount ? `<li><strong>Amount:</strong> $${project.amount}</li>` : ''}
            </ul>
            ${driveUrl ? `<p>Drive folder: <a href="${driveUrl}">${driveUrl}</a></p>` : ''}
            <p><a href="${projectUrl}" style="display:inline-block;padding:10px 18px;background:#C8C2BB;color:#111;text-decoration:none;border-radius:4px;font-size:13px;">Open project →</a></p>
          `,
        }),
      })
      if (!res.ok) console.error('Resend error:', await res.json())
    } catch (e) { console.error('Email send error:', e) }
  }

  return NextResponse.json({ success: true, project })
}
