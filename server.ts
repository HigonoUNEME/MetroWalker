import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { generateQuest } from './src/services/geminiService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    await kv.set(`quest:${id}`, quest, { ex: 86400 });
    res.json({ id, quest });
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

// API: お題取得
app.get("/api/quests/:id", async (req, res) => {
  try {
    const quest = await kv.get(`quest:${req.params.id}`);
    if (quest) res.json(quest);
    else res.status(404).json({ error: "Not Found" });
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

// ローカル開発時のみ Vite を動かす
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
  const PORT = 3000;
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

// Vercel 用にエクスポート
export default app;
