import React from 'react';
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const lineName = searchParams.get('line') || '東京メトロ';
    const totalDistance = searchParams.get('dist') || '0.00';
    const time = searchParams.get('time') || '--:--';
    const team = searchParams.get('team') || 'No Team';
    const start = searchParams.get('start') || 'Start';
    const end = searchParams.get('end') || 'Goal';
    const stations = searchParams.get('stations') || '0';

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#171717', padding: '80px', fontFamily: 'sans-serif' }}>
          
          {/* ヘッダー部分 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '120px', height: '120px', backgroundColor: '#facc15', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '40px' }}>
              <div style={{ fontSize: '80px', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>制覇完了！</div>
              <div style={{ fontSize: '40px', color: '#a3a3a3', marginTop: '20px' }}>{`${lineName} / 全${stations}駅`}</div>
            </div>
          </div>

          {/* 記録部分 */}
          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.1)', padding: '50px', borderRadius: '32px', flex: 1 }}>
              <div style={{ fontSize: '30px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '4px' }}>Total Walk</div>
              
              {/* 👇 エラー修正箇所：要素が2つあるので display: 'flex' を明示しました 👇 */}
              <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '10px' }}>
                <div style={{ fontSize: '80px', fontWeight: 900, color: 'white', lineHeight: 1 }}>{totalDistance}</div>
                <div style={{ fontSize: '40px', color: 'rgba(255,255,255,0.7)', marginLeft: '10px', paddingBottom: '8px' }}>km</div>
              </div>

            </div>
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.1)', padding: '50px', borderRadius: '32px', flex: 1 }}>
              <div style={{ fontSize: '30px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '4px' }}>Time</div>
              <div style={{ fontSize: '80px', fontWeight: 900, color: 'white', marginTop: '10px' }}>{time}</div>
            </div>
          </div>

          {/* フッター部分 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '50px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* 👇 ここも念のため要素をすべて display: 'flex' で囲んでいます 👇 */}
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '40px', fontWeight: 'bold', color: 'white' }}>
                <div style={{ display: 'flex' }}>{start}</div>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 20px' }}>
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                <div style={{ display: 'flex' }}>{end}</div>
              </div>

              <div style={{ fontSize: '30px', color: '#a3a3a3', marginTop: '15px' }}>{`Team: ${team}`}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '50px', fontWeight: 900, color: 'white', letterSpacing: '-2px' }}>MetroWalker</div>
              <div style={{ fontSize: '20px', color: '#737373', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '10px' }}>Tokyo Subway Journey</div>
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1080 }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image`, { status: 500 });
  }
}
