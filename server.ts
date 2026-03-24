import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';

// 【追加】フロントエンドにあったお題生成関数をサーバー側で読み込む
import { generateQuest } from './src/services/geminiService.js'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Database('quests.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS quests (
    id TEXT PRIMARY KEY,
    theme TEXT,
    mission TEXT,
    hint TEXT,
    isFoodMission BOOLEAN
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ① 【変更】駅の情報を受け取り、サーバーでお題を生成＆保存して返す
  app.post("/api/quests", async (req, res) => {
    // フロントからは駅名と難易度だけが送られてくる
    const { currentStation, nextStation, lineName, difficulty, isFoodChallenge } = req.body;
    
    try {
      // 1. サーバー側でお題を生成する！
      const quest = await generateQuest(currentStation, nextStation, lineName, difficulty, isFoodChallenge);
      
      // 2. そのままDBに保存
      const id = crypto.randomUUID();
      const stmt = db.prepare(`
        INSERT INTO quests (id, theme, mission, hint, isFoodMission)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, quest.theme, quest.mission, quest.hint, quest.isFoodMission ? 1 : 0);
      
      // 3. 発行したIDと、生成したお題をフロントに返す
      res.json({ id, quest });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "お題の生成に失敗しました" });
    }
  });

  // ② IDからクエストを取得するAPI (変更なし)
  app.get("/api/quests/:id", (req, res) => {
    const stmt = db.prepare('SELECT * FROM quests WHERE id = ?');
    const quest = stmt.get(req.params.id) as any;
    
    if (quest) {
      res.json({
        theme: quest.theme,
        mission: quest.mission,
        hint: quest.hint,
        isFoodMission: Boolean(quest.isFoodMission)
      });
    } else {
      res.status(404).json({ error: "Quest not found" });
    }
  });
  
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
