import { kv } from '@vercel/kv';

// 💡 プロジェクト内のファイルを一切インポートしないので、前回のようなエラーは絶対に起きません！
export default async function handler(req: any, res: any) {
  const { id } = req.query;

  // GETリクエスト：現在のルームの状況（写真や進み具合）を返す
  if (req.method === 'GET') {
    try {
      const data = await kv.get(`room:${id}`);
      return res.status(200).json(data || {});
    } catch (error) {
      return res.status(500).json({ error: "KV GET Error" });
    }
  }

  // POSTリクエスト：誰かが進んだり写真を上げたら、ルームの状況を上書き保存する
  if (req.method === 'POST') {
    try {
      await kv.set(`room:${id}`, req.body, { ex: 86400 * 3 }); // 3日間保存
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "KV POST Error" });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
