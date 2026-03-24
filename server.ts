import express from 'express';
import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { generateQuest } from './src/services/geminiService';

const app = express();
app.use(express.json());

// API: ヘルスチェック
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", storage: "vercel-kv" });
});

// API: お題生成・保存
app.post("/api/quests", async (req, res) => {
  const { currentStation, nextStation, lineName, difficulty, isFoodChallenge } = req.body;
  try {
    const quest = await generateQuest(currentStation, nextStation, lineName, difficulty, isFoodChallenge);
    const id = crypto.randomUUID();
    
    // ここでVercel KVを使用。環境変数がConnectされていれば自動で読み込まれます。
    await kv.set(`quest:${id}`, quest, { ex: 86400 });
    
    res.json({ id, quest });
  } catch (error) {
    console.error('KV Error:', error);
    res.status(500).json({ error: "KV connection or generation failed" });
  }
});

// API: お題取得
app.get("/api/quests/:id", async (req, res) => {
  try {
    const quest = await kv.get(`quest:${req.params.id}`);
    if (quest) res.json(quest);
    else res.status(404).json({ error: "Not Found" });
  } catch (error) {
    res.status(500).json({ error: "Retrieve failed" });
  }
});

// ローカル開発用（npm run devの時だけ動く）
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Local server: http://localhost:${PORT}`));
}

export default app;
