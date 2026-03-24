import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 追加: データベースの初期化とテーブル作成
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

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });


  // --- ここから追加: クエスト保存・取得API ---

  // ① 生成したクエストを保存してIDを返すAPI
  app.post("/api/quests", (req, res) => {
    const { theme, mission, hint, isFoodMission } = req.body;
    const id = crypto.randomUUID(); // 例: "abc-123-..."
    
    const stmt = db.prepare(`
      INSERT INTO quests (id, theme, mission, hint, isFoodMission)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // booleanを数値(0 or 1)に変換して保存
    stmt.run(id, theme, mission, hint, isFoodMission ? 1 : 0);
    
    res.json({ id });
  });

  // ② IDからクエストを取得するAPI
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
