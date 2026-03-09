import { put } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  // 1. GETリクエスト（ブラウザで直接開いた時）のチェック
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'API is alive!' });
  }

  // 2. POST以外（不正なアクセス）を弾く
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filename = req.query.filename || 'photo.jpg';

    // 3. Vercel Blob へのアップロード実行
    // 💡 Node.jsスタイルでは req 自体がデータストリームとして扱えます
    const blob = await put(filename, req, {
      access: 'public',
    });

    // 4. 成功したらURLを返す
    return res.status(200).json(blob);

  } catch (error: any) {
    console.error('Upload Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
