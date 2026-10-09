# Water Futures 2060 — Values Survey

Ternary-plot survey for MIS20070 Digital Society, Section 2 ("Changing values").
Respondents place one dot on each of two triangles (Today 2026 and 2060) to show
how society weighs three competing priorities for scarce water:

- **Survival** — water kept for human life
- **Innovation** — water for AI, data, and growth
- **Nature** — water returned to land and ecosystems

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 (or set a different port: `PORT=4000 npm start`).

Locally, responses are stored in `responses.json`. Download the Excel dataset at
`/export`.

## Deploy on Render (so classmates can submit from their own devices)

The included `render.yaml` provisions a free web service **and** a free Postgres
database, so responses survive restarts (the local JSON file does not persist on
Render's free tier — this is why we use Postgres in production).

1. Push this folder to a GitHub repository.
2. In Render, choose **New > Blueprint** and point it at the repo.
3. Render reads `render.yaml`, creates the web service and the database, and
   injects `DATABASE_URL` automatically.
4. When `DATABASE_URL` is present the server uses Postgres; otherwise it falls
   back to the local JSON file. No code changes needed between local and prod.

Once live, share the Render URL. Watch responses roll in via the live counter on
the page, and download the dataset any time from `<your-render-url>/export`.

## What this covers from the brief

- Ternary plot with the three values at each vertex ✔
- One dot per plot ✔
- One present-day response + one future-year (2060) response ✔
- One submission per respondent per plot ✔ (per-browser lock + server-side check)
- Exportable dataset as a real `.xlsx` ✔

## Aggregating responses (Python)

Once you have collected responses, download the dataset and run the aggregator
to produce the required ternary plot.

```bash
# one-time setup
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# download the latest data from your live site, then:
.venv/bin/python aggregate.py responses.xlsx
```

This produces `aggregated_ternary.png` with two triangles side by side (Today
2026 and 2060), each dot a respondent and an X marking the group mean. Use this
image as the screen grab for the report.

Still to do for Section 2:

- A screen grab of the aggregated plot (run `aggregate.py` on your real data)
- The short (250–350 word) analysis of the results
