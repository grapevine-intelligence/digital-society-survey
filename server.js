const express = require('express');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Storage layer.
// If DATABASE_URL is set (e.g. on Render), use Postgres so data survives
// restarts. Otherwise fall back to a local JSON file for easy local dev.
// Both expose the same async interface: init(), add(), all(), has().
// ---------------------------------------------------------------------------

function makeJsonStore() {
  const DATA_FILE = path.join(__dirname, 'responses.json');

  const read = () => {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
      return [];
    }
  };
  const write = (list) => fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));

  return {
    kind: 'json (local file)',
    async init() {},
    async has(respondentId) {
      return read().some((r) => r.respondentId === respondentId);
    },
    async add(row) {
      const list = read();
      list.push(row);
      write(list);
      return list.length;
    },
    async all() {
      return read();
    }
  };
}

function makePostgresStore(connectionString) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  return {
    kind: 'postgres',
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS responses (
          respondent_id      TEXT PRIMARY KEY,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          present_survival   INTEGER NOT NULL,
          present_innovation INTEGER NOT NULL,
          present_nature     INTEGER NOT NULL,
          future_survival    INTEGER NOT NULL,
          future_innovation  INTEGER NOT NULL,
          future_nature      INTEGER NOT NULL
        )
      `);
    },
    async has(respondentId) {
      const r = await pool.query(
        'SELECT 1 FROM responses WHERE respondent_id = $1',
        [respondentId]
      );
      return r.rowCount > 0;
    },
    async add(row) {
      await pool.query(
        `INSERT INTO responses
           (respondent_id, created_at,
            present_survival, present_innovation, present_nature,
            future_survival, future_innovation, future_nature)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          row.respondentId,
          row.timestamp,
          row.present.survival,
          row.present.innovation,
          row.present.nature,
          row.future.survival,
          row.future.innovation,
          row.future.nature
        ]
      );
      const c = await pool.query('SELECT COUNT(*)::int AS n FROM responses');
      return c.rows[0].n;
    },
    async all() {
      const r = await pool.query(
        'SELECT * FROM responses ORDER BY created_at ASC'
      );
      return r.rows.map((row) => ({
        respondentId: row.respondent_id,
        timestamp: row.created_at,
        present: {
          survival: row.present_survival,
          innovation: row.present_innovation,
          nature: row.present_nature
        },
        future: {
          survival: row.future_survival,
          innovation: row.future_innovation,
          nature: row.future_nature
        }
      }));
    }
  };
}

const store = process.env.DATABASE_URL
  ? makePostgresStore(process.env.DATABASE_URL)
  : makeJsonStore();

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const validWeights = (v) =>
  v &&
  ['survival', 'innovation', 'nature'].every(
    (k) => typeof v[k] === 'number' && v[k] >= 0 && v[k] <= 100
  );

app.post('/api/submit', async (req, res) => {
  try {
    const { respondentId, present, future } = req.body || {};

    if (!respondentId || !present || !future) {
      return res.status(400).json({ error: 'Missing respondentId, present, or future.' });
    }
    if (!validWeights(present) || !validWeights(future)) {
      return res.status(400).json({ error: 'Invalid value weights.' });
    }
    if (await store.has(respondentId)) {
      return res.status(409).json({ error: 'This respondent has already submitted.' });
    }

    const count = await store.add({
      respondentId,
      timestamp: new Date().toISOString(),
      present,
      future
    });

    res.json({ ok: true, count });
  } catch (err) {
    console.error('submit error:', err);
    res.status(500).json({ error: 'Server error while saving your response.' });
  }
});

app.get('/api/count', async (req, res) => {
  try {
    const all = await store.all();
    res.json({ count: all.length });
  } catch (err) {
    res.status(500).json({ error: 'Could not read count.' });
  }
});

app.get('/export', async (req, res) => {
  try {
    const responses = await store.all();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('responses');

    sheet.columns = [
      { header: 'respondentId', key: 'respondentId', width: 24 },
      { header: 'timestamp', key: 'timestamp', width: 24 },
      { header: 'present_survival', key: 'present_survival', width: 16 },
      { header: 'present_innovation', key: 'present_innovation', width: 18 },
      { header: 'present_nature', key: 'present_nature', width: 16 },
      { header: 'future_survival', key: 'future_survival', width: 16 },
      { header: 'future_innovation', key: 'future_innovation', width: 18 },
      { header: 'future_nature', key: 'future_nature', width: 16 }
    ];

    responses.forEach((r) => {
      sheet.addRow({
        respondentId: r.respondentId,
        timestamp: r.timestamp,
        present_survival: r.present.survival,
        present_innovation: r.present.innovation,
        present_nature: r.present.nature,
        future_survival: r.future.survival,
        future_innovation: r.future.innovation,
        future_nature: r.future.nature
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="responses.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('export error:', err);
    res.status(500).send('Could not generate export.');
  }
});

store
  .init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Digital Society survey running at http://localhost:${PORT}`);
      console.log(`Storage: ${store.kind}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise storage:', err);
    process.exit(1);
  });
