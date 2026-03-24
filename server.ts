import express from 'express';
import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { generateQuest } from './src/services/geminiService';

const app = express();
app.use(express.json());

// APIのみを定義
app.get("/api/health", (req, res) => res.json({ status: "ok", storage: "vercel-kv" }));

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

app.get("/api/quests/:id", async (req, res) => {
  try {
    const quest = await kv.get(`quest:${req.params.id}`);
    if (quest) res.json(quest);
    else res.status(404).json({ error: "Not Found" });
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

// ローカル開発用（Vercel本番では実行されません）
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

// Vercel用にエクスポート
export default app;
