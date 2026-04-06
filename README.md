# InTheFiles

> AI-powered search and chat interface for the Jeffrey Epstein public court records — 88,000+ documents, flight logs, depositions, and emails.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-inthefiles.vercel.app-black?style=for-the-badge&logo=vercel)](https://inthefiles.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

---

## What It Does

InTheFiles lets you ask natural language questions about the Epstein case files. Instead of manually searching through thousands of PDFs, you can ask things like:

- *"Who flew on the Lolita Express with Epstein?"*
- *"What do the depositions say about Maxwell's role?"*
- *"Find documents mentioning Prince Andrew"*

The AI searches the document database, retrieves the most relevant records, and gives you a sourced, well-formatted answer — citing the exact EFTA document IDs it used.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| AI | Google Gemini 2.0 Flash |
| Search | Meilisearch (hosted) |
| Deployment | Vercel (serverless) |
| Styling | Custom CSS — no UI framework |

---

## Features

- **Conversational search** — ask follow-up questions, the AI maintains context
- **Smart query extraction** — Gemini extracts the best search terms from your message before hitting the document DB
- **Dual-source answers** — primary results from the Epstein Files DB, supplemented by DOJ public records when needed
- **Source citations** — every answer references the EFTA document IDs used
- **Live database stats** — shows total document count on load
- **Suggested queries** — quick-start prompts for new users
- **Responsive dark UI** — works on desktop and mobile

---

## Local Development

### Prerequisites

- Node.js v18+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/taheriastic/inthefiles.git
cd inthefiles
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Then fill in your keys in `.env`:

```env
MEILI_HOST=https://epstein.dugganusa.com
MEILI_KEY=your_meilisearch_api_key
STATS_KEY=your_meilisearch_stats_key
GEMINI_API_KEY=your_gemini_api_key
```

> Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Start the dev server

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3001](http://localhost:3001)

The frontend proxies all `/api` requests to the backend automatically via Vite's dev proxy.

---

## Project Structure

```
inthefiles/
├── api/
│   └── index.ts             # Vercel serverless entry point
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   └── SuggestedQueries.tsx
│   │   ├── styles/
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── vite.config.ts
├── server/                  # Express backend
│   └── src/
│       ├── routes/
│       │   └── search.ts    # All API route handlers
│       └── index.ts         # Server entry point (local dev)
├── .env.example             # Required environment variables
├── vercel.json              # Vercel deployment config
└── docker-compose.yml       # Docker setup (optional)
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send a message, get an AI-sourced answer |
| `GET` | `/api/search?q=` | Raw search against the document DB |
| `GET` | `/api/stats` | Database statistics (total docs, etc.) |

### Chat request body

```json
{
  "message": "Who was on Epstein's flight logs?",
  "history": []
}
```

---

## Deployment

This app is deployed on **Vercel** using a serverless architecture — the React app is served as static files from Vercel's CDN, and the Express API runs as a serverless function.

### Deploy your own

1. Fork this repo
2. Import it at [vercel.com/new](https://vercel.com/new)
3. Add the environment variables from `.env.example` in the Vercel dashboard
4. Deploy

### Docker (self-hosted)

```bash
# Build and run
npm run docker:up

# Stop
npm run docker:down
```

Available at `http://localhost:3001`.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MEILI_KEY` | Meilisearch API key for document search | Yes |
| `STATS_KEY` | Meilisearch key for stats endpoint | Yes |
| `GEMINI_API_KEY` | Google Gemini API key for AI responses | Yes |
| `MEILI_HOST` | Meilisearch host URL | No (has default) |

> **Never commit your `.env` file.** It is listed in `.gitignore`. Use `.env.example` as a template.

---

## Data Source

All documents are sourced from the publicly released Epstein Files — court records, depositions, flight logs, and emails that have entered the public domain. This project does not host or reproduce the documents itself; it provides a search interface over an existing public database.

---

## License

MIT — for educational and research purposes. All underlying data is from public court records.
