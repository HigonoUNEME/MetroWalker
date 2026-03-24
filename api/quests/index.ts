// api/quests/index.ts
import { kv } from '@vercel/kv';
import crypto from 'crypto';
// 先ほど作った駅データから関数を読み込む（パスは ../../ になります）
import { generateQuest } from '../../src/data/stationData';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const { currentStation, nextStation, lineName, difficulty, isFoodChallenge } = req.body;
  
  try {
    // 1. お題を作る
    const quest = await generateQuest(currentStation, nextStation, lineName, difficulty, isFoodChallenge);
    const id = crypto.randomUUID();
    
    // 2. KVに保存する
    await kv.set(`quest:${id}`, quest, { ex: 86400 });
    
    // 3. アプリに返す
    return res.status(200).json({ id, quest });
  } catch (error) {
    console.error('KV Save Error:', error);
    return res.status(500).json({ error: "Failed to generate or save quest" });
  }
}
