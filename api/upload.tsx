import { put } from '@vercel/blob';

// 💡 runtime: 'edge' の指定を消しました（Node.jsランタイムで動かします）

export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'photo.jpg';

    if (!request.body) {
      return new Response('No body', { status: 400 });
    }

    // Vercel Blobに保存
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    // JSONで結果を返す
    return new Response(JSON.stringify(blob), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return new Response('Upload failed', { status: 500 });
  }
}
