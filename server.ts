import express from 'express';
import { kv } from '@vercel/kv';
import crypto from 'crypto';

// 💡 Geminiを捨て、ローカルのお題バンクから取得する関数をインポート
import { getRandomQuest } from './src/missionBank';

const app = express();
app.use(express.json());

// API: ヘルスチェック
app.get("/api/health", (req, res) => res.json({ status: "ok", storage: "vercel-kv" }));

// API: お題生成 (AI不使用・ランダムチョイス)
app.post("/api/quests", async (req, res) => {
  const { currentStation, nextStation, lineName, difficulty, isFoodChallenge } = req.body;
  
  try {
    // 1. バンクから一瞬でお題を引く
    const quest = getRandomQuest(difficulty, isFoodChallenge);
    
    // (おまけ: お題のテキストに駅名を動的に混ぜることもできます)
    // quest.mission = `${currentStation}から${nextStation}の道中で... ${quest.mission}`;

    // 2. IDを発行してKVに保存
    const id = crypto.randomUUID();
    await kv.set(`quest:${id}`, quest, { ex: 86400 });
    
    // 3. 画面に返す
    res.json({ id, quest });
  } catch (error) {
    console.error('KV Error:', error);
    res.status(500).json({ error: "Failed to create quest" });
  }
});

// API: お題取得 (リロード時用)
app.get("/api/quests/:id", async (req, res) => {
  try {
    const quest = await kv.get(`quest:${req.params.id}`);
    if (quest) res.json(quest);
    else res.status(404).json({ error: "Not Found" });
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

// ローカル開発用
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

export default app;
