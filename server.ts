import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { kv } from '@vercel/kv';
import crypto from 'crypto';

// フロントエンドのお題生成ロジックをインポート
import { generateQuest } from './src/services/geminiService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Expressアプリの初期化
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 2. ヘルスチェックAPI
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", storage: "vercel-kv" });
});

// 3. お題を生成＆クラウドDB(KV)に保存するAPI
app.post("/api/quests", async (req, res) => {
  const { currentStation, nextStation, lineName, difficulty, isFoodChallenge } = req.body;
  
  try {
    const quest = await generateQuest(currentStation, nextStation, lineName, difficulty, isFoodChallenge);
    const id = crypto.randomUUID();

    // Vercel KVに保存 (有効期限24時間: 86400秒)
    await kv.set(`quest:${id}`, quest, { ex: 86400 });
    
    res.json({ id, quest });
  } catch (error) {
    console.error('KV Save Error:', error);
    res.status(500).json({ error: "お題の生成または保存に失敗しました" });
  }
});

// 4. クラウドDB(KV)からお題を取得するAPI
app.get("/api/quests/:id", async (req, res) => {
  try {
    const quest = await kv.get(`quest:${req.params.id}`);
    
    if (quest) {
      res.json(quest);
    } else {
      res.status(404).json({ error: "Quest not found" });
    }
  } catch (error) {
    console.error('KV Get Error:', error);
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
});

// 5. ローカル開発環境と本番(Vercel)環境の振り分け
if (process.env.NODE_ENV !== 'production') {
  // 【ローカル開発用】Viteを起動し、サーバーをリッスンする
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })();
} else {
  // 【本番(Vercel)用】静的ファイルを配信する（app.listenはしない）
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// 【超重要】Vercel(サーバーレス)で動かすために、app自体をエクスポートする
export default app;
