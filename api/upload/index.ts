import { put } from '@vercel/blob';

export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'photo.jpg';

    if (!request.body) {
      return new Response('No body', { status: 400 });
    }

    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return new Response(JSON.stringify(blob), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Upload failed', { status: 500 });
  }
}
