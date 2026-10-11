# Adding your own photos & videos to the site

## Videos
Keep using Vimeo (same as the rest of the site already does) — upload there,
then grab the video's numeric ID from its URL (e.g. `vimeo.com/1234567890` →
`1234567890`). Don't put raw video files in this folder/repo — they're huge,
make every `git` operation slow, and can push past Vercel's deployment size
limit.

## Photos
Drop image files into `public/images/work/` (create subfolders per project
if that's easier to manage, e.g. `public/images/work/23-sullivan-road/`).
Keep them reasonably compressed — large multi-MB originals will slow the
site down and bloat the git repo over time. A few hundred KB to ~1-2MB per
photo, exported at around 2000px on the long edge, is plenty for web.

## Adding a project to the Our Work page
Open `src/lib/workProjects.ts` and add an entry to the `WORK_PROJECTS` array:

```ts
{
  id: 'unique-slug',
  title: 'Project Name',
  client: 'Client Name · Location',
  category: 'Architectural' | 'Commercial' | 'Events',
  type: 'Property Film' | 'Brand Film' | whatever fits,
  vimeoId: '1234567890',          // for a video project
  thumb: '/images/work/....jpg',  // the still shown before hover/click, and the click-to-play poster
  description: 'Longer write-up shown in the project detail view — a couple of sentences is plenty.',
  images: ['/images/work/project-slug/1.jpg', '/images/work/project-slug/2.jpg'], // optional extra photos, shown in a "More from this project" gallery
}
```

Photo-only projects can omit `vimeoId` — the detail view will just show the
`thumb` image full-size. The `images` array is optional too — if you leave it
out, the detail view simply skips the gallery section rather than showing
anything empty, so there's no rush to have extra photos ready for every
project.

If you'd rather just hand me the files and details, I can add them directly —
either way works.
