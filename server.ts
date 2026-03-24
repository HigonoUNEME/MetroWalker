import express from 'express';
import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { generateQuest } from './src/services/geminiService';

const app = express();
app.use(express.json());

// API: ヘルスチェック
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// API: お題生成
app.post("/api/quests", async (req, res) => {
  try {
    const quest = await generateQuest(req.body.currentStation, req.body.nextStation, req.body.lineName, req.body.difficulty, req.body.isFoodChallenge);
    const id = crypto.randomUUID();
    await kv.set(`quest:${id}`, quest, { ex: 86400 });
    res.json({ id, quest });
  } catch (e) { res.status(500).json({ error: "fail" }); }
});

// API: お題取得
app.get("/api/quests/:id", async (req, res) => {
  const quest = await kv.get(`quest:${req.params.id}`);
  if (quest) res.json(quest);
  else res.status(404).send("Not Found");
});

// 💡 本番（Vercel）では静的ファイル配信を一切行わない
// これにより Vercel 本来の高速なファイル配信と衝突しなくなります。

export default app;
