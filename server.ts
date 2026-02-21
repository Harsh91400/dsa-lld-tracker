import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("tracker.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'DSA' or 'LLD'
    video_link TEXT,
    video_watched INTEGER DEFAULT 0,
    video_watched_at TEXT,
    notes_completed INTEGER DEFAULT 0,
    notes_completed_at TEXT,
    revision_done INTEGER DEFAULT 0,
    revision_done_at TEXT,
    order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    link TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    UNIQUE(topic_id, link)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/data", (req, res) => {
    const topics = db.prepare("SELECT * FROM topics ORDER BY category, order_index").all();
    const questions = db.prepare("SELECT * FROM questions").all();
    
    // Group questions by topic
    const data = topics.map(topic => ({
      ...topic,
      questions: questions.filter(q => q.topic_id === topic.id)
    }));

    res.json(data);
  });

  app.post("/api/topics/init", (req, res) => {
    const { dsaTopics, lldTopics } = req.body;
    
    const insertTopic = db.prepare(`
      INSERT OR IGNORE INTO topics (id, name, category, order_index) 
      VALUES (?, ?, ?, ?)
    `);

    const insertQuestion = db.prepare(`
      INSERT OR IGNORE INTO questions (id, topic_id, name, platform, difficulty, link)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      // Process DSA Topics
      dsaTopics.forEach((t: any, i: number) => {
        const topicId = `dsa-${t.name.toLowerCase().replace(/\s+/g, '-')}`;
        insertTopic.run(topicId, t.name, 'DSA', i);
        
        // Check current questions count for this topic
        const currentQuestions = db.prepare("SELECT id FROM questions WHERE topic_id = ?").all(topicId);
        
        t.questions?.forEach((q: any) => {
          const qId = `q-${q.name.toLowerCase().replace(/\s+/g, '-')}`;
          insertQuestion.run(qId, topicId, q.name, q.platform, q.difficulty, q.link);
        });
      });

      // Process LLD Topics
      lldTopics.forEach((t: any, i: number) => {
        const topicId = `lld-${t.name.toLowerCase().replace(/\s+/g, '-')}`;
        insertTopic.run(topicId, t.name, 'LLD', i);
        t.questions?.forEach((q: any) => {
          const qId = `q-${q.name.toLowerCase().replace(/\s+/g, '-')}`;
          insertQuestion.run(qId, topicId, q.name, q.platform, q.difficulty, q.link);
        });
      });
    });

    transaction();
    res.json({ success: true });
  });

  app.post("/api/questions/add", (req, res) => {
    const { topicId, name, platform, difficulty, link } = req.body;
    
    if (!topicId || !name || !platform || !difficulty || !link) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const id = `q-custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      db.prepare(`
        INSERT INTO questions (id, topic_id, name, platform, difficulty, link)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, topicId, name, platform, difficulty, link);
      
      const newQuestion = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
      res.json(newQuestion);
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Question link already exists" });
      } else {
        res.status(500).json({ error: "Failed to add question" });
      }
    }
  });

  app.post("/api/update-checklist", (req, res) => {
    const { topicId, field, value, timestamp } = req.body;
    const timestampField = `${field}_at`;
    const query = `UPDATE topics SET ${field} = ?, ${timestampField} = ? WHERE id = ?`;
    db.prepare(query).run(value ? 1 : 0, value ? timestamp : null, topicId);
    res.json({ success: true });
  });

  app.post("/api/update-question", (req, res) => {
    const { questionId, value, timestamp } = req.body;
    db.prepare("UPDATE questions SET completed = ?, completed_at = ? WHERE id = ?")
      .run(value ? 1 : 0, value ? timestamp : null, questionId);
    res.json({ success: true });
  });

  app.post("/api/update-video-link", (req, res) => {
    const { topicId, videoLink } = req.body;
    db.prepare("UPDATE topics SET video_link = ? WHERE id = ?").run(videoLink, topicId);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
