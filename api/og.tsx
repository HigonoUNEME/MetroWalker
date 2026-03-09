import React from 'react';
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge', // Vercelの爆速サーバーを使うおまじない
};

export default function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // アプリから送られてきたデータを受け取る
    const lineName = searchParams.get('line') || '東京メトロ';
    const totalDistance = searchParams.get('dist') || '0.00';
    const time = searchParams.get('time') || '--:--';
    const team = searchParams.get('team') || 'No Team';
    const start = searchParams.get('start') || 'Start';
    const end = searchParams.get('end') || 'Goal';
    const stations = searchParams.get('stations') || '0';

    // サーバー側で画像を組み立てる（サイズは正方形 1080x1080）
    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#171717', padding: '80px', fontFamily: 'sans-serif' }}>
          
          {/* ヘッダー部分 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '120px', height: '120px', backgroundColor: '#facc15', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '60px' }}>🏆</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '40px' }}>
              <div style={{ fontSize: '80px', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>制覇完了！</div>
              <div style={{ fontSize: '40px', color: '#a3a3a3', marginTop: '20px' }}>{lineName} / 全{stations}駅</div>
            </div>
          </div>

          {/* 記録部分 */}
          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.1)', padding: '50px', borderRadius: '32px', flex: 1 }}>
              <div style={{ fontSize: '30px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '4px' }}>Total Walk</div>
              <div style={{ fontSize: '80px', fontWeight: 900, color: 'white', marginTop: '10px' }}>{totalDistance} <span style={{ fontSize: '40px', color: 'rgba(255,255,255,0.7)' }}>km</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.1)', padding: '50px', borderRadius: '32px', flex: 1 }}>
              <div style={{ fontSize: '30px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '4px' }}>Time</div>
              <div style={{ fontSize: '80px', fontWeight: 900, color: 'white', marginTop: '10px' }}>{time}</div>
            </div>
          </div>

          {/* フッター部分 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '50px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '40px', fontWeight: 'bold', color: 'white' }}>{start} ➔ {end}</div>
              <div style={{ fontSize: '30px', color: '#a3a3a3', marginTop: '15px' }}>Team: {team}</div>
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
