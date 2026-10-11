// The public site's portfolio data — one array, easy to extend. Add a new
// project by adding an entry here; vimeoId for video, or images (paths
// under /public/images/work/...) for a photo-only project. See
// CONTENT_README.md at the project root for where to put the actual files.
export type WorkCategory = 'Architectural' | 'Commercial' | 'Events'

// Only meaningful on Architectural projects — lets the Property page split
// its showcase between still-building sites and finished properties.
export type PropertyType = 'Construction' | 'Property'

export type WorkProject = {
  id: string
  title: string
  client: string
  category: WorkCategory
  type: string
  propertyType?: PropertyType
  vimeoId?: string
  thumb?: string
  images?: string[]
  description?: string
}

export const WORK_PROJECTS: WorkProject[] = [
  {
    id: '23-sullivan-road',
    title: '23 Sullivan Road',
    client: 'Luxury Residential · Hawke\'s Bay',
    category: 'Architectural',
    type: 'Property Film',
    propertyType: 'Property',
    vimeoId: '1182465760',
    thumb: 'https://i.vimeocdn.com/video/2145085364-8d9dea98f801df737866495fc8d2a5478fa035bacadf0b509fe24095202d4f0f-d_1280x720?region=us',
    description: 'A cinematic property film shot for a luxury Hawke\'s Bay listing — pacing, light and movement built around the way the home actually lives, so a viewer gets a feel for the space before ever walking through the door.',
  },
  {
    id: 'river-downs',
    title: 'River Downs',
    client: 'Premium Listing · Hawke\'s Bay',
    category: 'Architectural',
    type: 'Property Film',
    propertyType: 'Property',
    vimeoId: '1182467090',
    thumb: 'https://i.vimeocdn.com/video/2145086135-8b197218926ba3cb5b7473637eec6b840a9145d41cf3fddf64b4692371696b72-d_1280x720?region=us',
    description: 'A premium Hawke\'s Bay listing captured end to end — grounds, interiors and outlook all framed to give prospective buyers a genuine sense of scale and setting ahead of an open home.',
  },
  {
    id: 'clyde-street',
    title: 'Clyde Street',
    client: 'Property Film · Hawke\'s Bay',
    category: 'Architectural',
    type: 'Property Film',
    propertyType: 'Property',
    vimeoId: '1216751474',
    thumb: 'https://i.vimeocdn.com/video/2188266667-68b9d4ee59946fef552d97ba3dd5b3917302c427d524f800fbb8c2638e9fb654-d_1280x720?region=us',
    description: 'A Hawke\'s Bay property film built around natural light — scheduled to catch the home at its best hour and edited to keep a steady, unhurried pace throughout.',
  },
  {
    id: 'social-project',
    title: 'Social Project',
    client: 'Commercial · Wellington',
    category: 'Commercial',
    type: 'Brand Film',
    vimeoId: '1216751477',
    thumb: 'https://i.vimeocdn.com/video/2188267258-642a37f197a11b257107e3026f603bd9b101e150481feba60d316c736e8fcedd-d_1280x720?region=us',
    description: 'A social-first brand film built to perform in a crowded feed — short, punchy and edited for sound-off viewing first, with a cut built for the platforms it was actually made for.',
  },
  {
    id: 'flex-fitness-taupo',
    title: 'Flex Fitness Taupo',
    client: 'Commercial · Taupo',
    category: 'Commercial',
    type: 'Brand Film',
    vimeoId: '1216751475',
    thumb: 'https://i.vimeocdn.com/video/2188266630-2c8ea8c5eb08f67c7c3976794eae813194b3bfb49295bbc45436f3fb79a978a3-d_1280x720?region=us',
    description: 'A brand film for Flex Fitness Taupo — shot on location to capture the energy of the gym floor and give the brand a piece of content that feels as high-energy as the space itself.',
  },
  {
    id: 'what-we-do',
    title: 'What We Do',
    client: 'Example Content · Showreel',
    category: 'Commercial',
    type: 'Showreel',
    vimeoId: '1216750682',
    thumb: 'https://i.vimeocdn.com/video/2188265524-4fb9e0ca30cc6d8acb3df1a1c4259eee688d7929c486e1f353c4f0858475be60-d_1280x720?region=us',
    description: 'A showreel pulling together property, commercial and event work from across the studio — the fastest way to see the full range of what Example Content does in one sitting.',
  },
]
