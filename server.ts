import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { kv } from '@vercel/kv'; // Vercel KVをインポート
import crypto from 'crypto';

// お題生成ロジックのインポート
// パスがエラーになる場合は './src/services/geminiService' などを確認してください
import { generateQuest } from './src/services/geminiService'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // ヘルスチェック用
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", storage: "vercel-kv" });
  });

  /**
   * ① お題を生成し、Vercel KVに保存するAPI
   * フロントエンドの fetchNextQuest から呼ばれます
   */
  app.post("/api/quests", async (req, res) => {
    const { currentStation, nextStation, lineName, difficulty, isFoodChallenge } = req.body;
    
    try {
      // 1. お題を生成 (中身はmissionBankからのランダム選択)
      const quest = await generateQuest(currentStation, nextStation, lineName, difficulty, isFoodChallenge);
      
      // 2. ユニークなIDを発行
      const id = crypto.randomUUID();

      // 3. Vercel KVに保存
      // 有効期限を24時間(86400秒)に設定（必要に応じて変更してください）
      await kv.set(`quest:${id}`, quest, { ex: 86400 });
      
      // 4. IDとお題をフロントに返す
      res.json({ id, quest });
    } catch (error) {
      console.error('KV Save Error:', error);
      res.status(500).json({ error: "お題の生成または保存に失敗しました" });
    }
  });

  /**
   * ② IDからお題を取得するAPI
   * リロード時や、LINEで共有されたURLを開いた時に呼ばれます
   */
  app.get("/api/quests/:id", async (req, res) => {
    try {
      const quest = await kv.get(`quest:${req.params.id}`);
      
      if (quest) {
        res.json(quest);
      } else {
        res.status(404).json({ error: "お題が見つかりませんでした" });
      }
    } catch (error) {
      console.error('KV Get Error:', error);
      res.status(500).json({ error: "データの取得に失敗しました" });
    }
  });

  // --- Vite / 静的ファイル配信設定 ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
export default app;
