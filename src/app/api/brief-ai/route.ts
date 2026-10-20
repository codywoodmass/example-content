import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rates stay exactly as set on the brief — these are only reference points
// so Claude's hour estimates land in a sane range, never dollar amounts.
const SYSTEM_PROMPT = `You are a production-brief drafting assistant for Example Content, a New Zealand video and photography production studio specialising in property, commercial, and brand video work.

Given a client's email, brief, or requirements (pasted in by the studio), propose a draft production brief: scope, creative direction, and hours. Use these reference rates only to judge reasonable hours — do not mention dollar amounts in your response:
- Filming: ~$175/hr
- Editing: ~$100/hr
- Pre-production: ~$50/hr
- Travel: ~$1.17/km

Typical jobs: property walkthroughs (2-3hrs shoot, 3-4hrs edit), content campaigns / social packages (3hrs shoot, 3.5hrs edit), lifestyle/brand films (4hrs shoot, 6hrs edit), architectural/commercial (varies, often multi-day). Categories in use: Commercial, Architectural, Events, Documentary, Social Content, Sport & Fitness.

The creative direction (projectGoals, tone) should capture how the crew should actually shoot and edit this — mood, pacing, visual style — based on what the client described, not generic marketing language. Be concrete and conservative on hours — when the brief is vague, propose the smaller reasonable estimate and say so in "assumptions" rather than over-scoping. List any assumptions, missing info, or things the studio should confirm with the client in "assumptions".`

const BriefSchema = z.object({
  projectName: z.string().nullable().describe('A short project name, e.g. "Harvest Season Brand Film"'),
  jobType: z.string().nullable().describe('e.g. Brand Film, Property Walkthrough, Event Coverage'),
  jobDescription: z.string().nullable().describe('2-4 sentence summary of the job'),
  category: z.enum(['Commercial', 'Architectural', 'Events', 'Documentary', 'Social Content', 'Sport & Fitness']).nullable(),
  locations: z.string().nullable(),
  projectGoals: z.string().nullable().describe('What this film/shoot needs to achieve and how it should feel'),
  tone: z.string().nullable().describe('Short tone/mood descriptor, e.g. "Warm, cinematic, premium — golden hour palette"'),
  deliveryEstimate: z.string().nullable().describe('e.g. "10-14 business days"'),
  deliverables: z.array(z.object({
    name: z.string(),
    quantity: z.number().int().min(1),
    duration: z.string().describe('e.g. "2-3 min", "30-60 sec"'),
    formats: z.array(z.string()),
  })),
  shootHours: z.number().min(0),
  editHours: z.number().min(0),
  preProdHours: z.number().min(0),
  travelKm: z.number().min(0),
  assumptions: z.string().describe('Assumptions made and anything to confirm with the client'),
})

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI drafting is not configured (missing ANTHROPIC_API_KEY)' }, { status: 503 })
  }
  const { text } = await req.json()
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  try {
    const response = await anthropic.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      output_config: { effort: 'medium', format: zodOutputFormat(BriefSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Client brief/requirements:\n\n${text.slice(0, 20000)}` }],
    })
    if (!response.parsed_output) {
      return NextResponse.json({ error: 'AI did not return a usable brief' }, { status: 502 })
    }
    return NextResponse.json({ brief: response.parsed_output })
  } catch (e: any) {
    console.error('Brief AI error:', e)
    return NextResponse.json({ error: e.message || 'AI drafting failed' }, { status: 500 })
  }
}
