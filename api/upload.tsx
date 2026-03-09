import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'photo.jpg';

    if (!request.body) {
      return new Response('No body', { status: 400 });
    }

    // 届いた写真データをそのままVercel Blobに保存する
    const blob = await put(filename, request.body, {
      access: 'public', // 誰でも見れる設定（シェア用なので）
    });

    // 保存したあとの「写真のURL」をアプリに返してあげる
    return NextResponse.json(blob);
  } catch (error) {
    return new Response('Upload failed', { status: 500 });
  }
}
