import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function buildSectionPrompts(body: any) {
  const { form, lineItems, selectedEquipment, selectedCrew, grandTotal, aiTone } = body

  const crewList = selectedCrew?.map((c: any) => `${c.name} (${c.role}) — ${c.days} day${c.days > 1 ? 's' : ''}`).join(', ') || 'TBC'
  const equipList = selectedEquipment?.map((e: any) => `${e.name} (${e.days} day${e.days > 1 ? 's' : ''})`).join(', ') || 'TBC'
  const lineList = lineItems?.map((i: any) => `${i.description}: ${i.qty} × $${i.rate} = $${i.qty * i.rate}`).join('\n') || ''

  const toneInstruction = `Writing tone: ${aiTone || 'Professional and confident.'}`

  return {
    0: `${toneInstruction}

Write the Cover section for a pitch deck from Example Content (a New Zealand video production company specialising in high-end property and commercial film) to ${form.clientName || 'the client'}, contact ${form.contactName || ''}, for the project: "${form.project}". Category: ${form.category}.
${form.logoUrl ? `Client logo: ${form.logoUrl}` : ''}
${form.brandGuidelinesUrl ? `Brand guidelines: ${form.brandGuidelinesUrl}` : ''}

Write 3-4 sentences max. Include: a welcome/opening line addressed to the client by name, the project name, and a positioning statement about Example Content's expertise in this type of work. Match the tone instruction exactly.`,

    1: `${toneInstruction}

Write the Creative Direction section for a pitch deck for ${form.clientName}, project: "${form.project}".

Project goals: ${form.projectGoals || 'Not specified'}
Tone & mood: ${form.tone || 'Not specified'}
References & inspiration: ${form.references || 'None provided'}
${form.moodboardUrl ? `Moodboard: ${form.moodboardUrl}` : ''}
${form.brandGuidelinesUrl ? `Brand guidelines: ${form.brandGuidelinesUrl}` : ''}

Write a compelling creative direction section that shows you understand the client's vision. Cover: the conceptual approach, visual style, mood, and how Example Content will bring this to life. 3-4 paragraphs. Match the tone instruction exactly.`,

    2: `${toneInstruction}

Write the Scope & Deliverables section for a pitch deck for ${form.clientName}, project: "${form.project}".

What will be delivered:
${form.deliverables || 'To be confirmed'}

Shoot details:
- ${form.shootDays} shoot day${parseInt(form.shootDays) > 1 ? 's' : ''}
- Dates: ${form.shootDates || 'TBC'}
- Locations: ${form.locations || 'TBC'}
- Delivery estimate: ${form.deliveryEstimate}

Crew on set: ${crewList}
Equipment: ${equipList}

Write clearly and specifically. List what the client will receive and when. Match the tone instruction exactly.`,

    3: `${toneInstruction}

Write the Pricing section for a pitch deck for ${form.clientName}, project: "${form.project}".

Itemised breakdown:
${lineList}
${selectedCrew?.length ? `\nCrew:\n${selectedCrew.map((c: any) => `${c.name} (${c.role}): ${c.days} days × $${c.rate} = $${c.days * c.rate}`).join('\n')}` : ''}
${selectedEquipment?.length ? `\nEquipment:\n${selectedEquipment.map((e: any) => `${e.name}: ${e.days} days × $${e.rate} = $${e.days * e.rate}`).join('\n')}` : ''}

Total: $${grandTotal?.toLocaleString()} + GST

Include: a note that a 50% deposit is required to confirm the project, balance due on delivery. Keep it transparent and professional. Match the tone instruction exactly.`,

    4: `${toneInstruction}

Write the Timeline & Crew section for a pitch deck for ${form.clientName}, project: "${form.project}".

Shoot days: ${form.shootDays}
Shoot dates: ${form.shootDates || 'TBC'}
Delivery estimate: ${form.deliveryEstimate}
Crew: ${crewList}
Equipment: ${equipList}
Locations: ${form.locations || 'TBC'}

Write a clear timeline from project confirmation through to final delivery. Include: deposit & booking, pre-production, shoot day(s), post-production, rough cut review, final delivery. Also introduce the crew and their roles. Match the tone instruction exactly.`,

    5: `${toneInstruction}

Write the Terms & Conditions section for a pitch deck from Example Content to ${form.clientName}.

Include these points:
- Proposal valid for 14 days from issue date
- 50% deposit required to confirm project, balance due on final delivery
- Cancellations within 48 hours of shoot day incur a 25% cancellation fee
- Example Content retains rights to use footage for portfolio/promotional purposes unless a written waiver is requested before shoot day
- All prices are exclusive of GST
- Files delivered via Google Drive, retained for 60 days after delivery
- Standard turnaround: ${form.deliveryEstimate || '10-14 business days'}
- Any additional shoot days or scope changes will be quoted separately

Write professionally but in plain language — this should feel like a trusted creative partner's terms, not a legal document. Match the tone instruction exactly.`,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sectionOnly } = body
    const prompts = buildSectionPrompts(body)

    if (sectionOnly !== undefined) {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompts[sectionOnly as keyof typeof prompts] }],
      })
      const text = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      return NextResponse.json({ sections: { [sectionOnly]: text } })
    }

    const results = await Promise.all(
      [0, 1, 2, 3, 4, 5].map(async (idx) => {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompts[idx as keyof typeof prompts] }],
        })
        const text = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
        return { idx, text }
      })
    )

    const sections: Record<number, string> = {}
    results.forEach(({ idx, text }) => { sections[idx] = text })

    return NextResponse.json({ sections })
  } catch (error: any) {
    console.error('Pitch deck generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate pitch deck' }, { status: 500 })
  }
}
