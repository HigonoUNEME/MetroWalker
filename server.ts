import express from 'express';
import { kv } from '@vercel/kv';
import crypto from 'crypto';

// フロントエンドの関数をインポート（パスや拡張子が違う場合は適宜修正してください）
import { generateQuest } from './src/services/geminiService';

const app = express();

// POSTリクエストのデータを受け取るための設定
app.use(express.json());

// ---------------------------------------------------
// APIルートの定義 (Vercel上ではここだけが動きます)
// ---------------------------------------------------

// ヘルスチェック用
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", storage: "vercel-kv" });
});

// お題を生成し、Vercel KVに保存するAPI
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
    res.status(500).json({ error: "Failed to generate or save quest" });
  }
});

// クラウドDB(KV)からお題を取得するAPI
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
    res.status(500).json({ error: "Failed to retrieve quest" });
  }
});

// ---------------------------------------------------
// ローカル開発時のみ動かす設定 (Vercelでは無視されます)
// ---------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  // Vercelでのビルドエラーを防ぐため、Viteは動的インポートで読み込む
  import('vite').then(async ({ createServer }) => {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(console.error);
}

// ---------------------------------------------------
// Vercel サーバーレス関数用のエクスポート（超重要！）
// ---------------------------------------------------
export default app;
