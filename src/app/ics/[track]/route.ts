// Per-track calendar feed: /ics/<trackId>, subscribed to as
// webcal://herrang.stockholmswing.com/ics/<trackId>. Statically generated,
// one route per track in the master schedule — while the master schedule is
// empty this generates no routes at all.

import { loadHerrangData } from '@/lib/herrang/data';
import { buildTrackCalendar } from '@/lib/herrang/ical';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return loadHerrangData().week.tracks.map((t) => ({ track: t.id }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ track: string }> }
) {
  const { track: trackId } = await params;
  const { week, venues } = loadHerrangData();
  const track = week.tracks.find((t) => t.id === trackId);
  if (!track) return new Response('Not found', { status: 404 });

  const body = buildTrackCalendar(week, track, venues);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="herrang-${track.id}.ics"`,
      'Cache-Control':
        'public, max-age=0, s-maxage=43200, stale-while-revalidate=86400',
    },
  });
}
