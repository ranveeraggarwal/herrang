// OG image in the daily-poster language: white ground, chunky uppercase,
// flat color blocks. Deliberately shares nothing with a generic app-card look.

import { ImageResponse } from 'next/og';

export const alt = 'My Herräng — what is happening today, at a glance';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadFont(family: string, weight: number): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/url\(([^)]+)\)/);
  if (!match) throw new Error(`Failed to load font: ${family}`);
  return fetch(match[1]).then((r) => r.arrayBuffer());
}

// The poster palette: color = meaning.
const BLOCKS = ['#3BA55D', '#F4801F', '#CE2B37', '#7FD4E0', '#F2A0A9'];

export default async function Image() {
  const archivo = await loadFont('Archivo Black', 400);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          padding: 72,
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Archivo Black',
            color: '#141414',
            fontSize: 110,
            lineHeight: 1.02,
            textTransform: 'uppercase',
          }}
        >
          <span>My</span>
          <span>Herräng</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              fontFamily: 'Archivo Black',
              fontSize: 30,
              color: '#141414',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            Classes · DJs · Shows · Jams — at a glance
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {BLOCKS.map((c) => (
              <div
                key={c}
                style={{
                  width: 190,
                  height: 56,
                  backgroundColor: c,
                  borderRadius: 12,
                  display: 'flex',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Archivo Black', data: archivo, weight: 400 as const }],
    }
  );
}
