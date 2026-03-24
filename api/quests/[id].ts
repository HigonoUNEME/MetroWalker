// api/quests/[id].ts
import { kv } from '@vercel/kv';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ファイル名 [id].ts のおかげで、URLのIDをここで受け取れます
  const { id } = req.query;

  try {
    const quest = await kv.get(`quest:${id}`);
    
    if (quest) {
      return res.status(200).json(quest);
    } else {
      return res.status(404).json({ error: "Quest not found" });
    }
  } catch (error) {
    console.error('KV Get Error:', error);
    return res.status(500).json({ error: "Failed to retrieve quest" });
  }
}
