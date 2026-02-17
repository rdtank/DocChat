# DocChat

A full-stack **Retrieval-Augmented Generation (RAG)** app that lets you upload any PDF, TXT, or Markdown document and chat with it in real time. Built from scratch with a production-grade pipeline — chunking, vector embeddings, semantic search, streaming LLM responses, and a built-in eval system.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_+_pgvector-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=flat&logo=google&logoColor=white)

---

## What It Does

1. **Upload** a document (PDF / TXT / Markdown)
2. The backend **parses, chunks, and embeds** it into a pgvector database asynchronously via a BullMQ worker
3. You **ask a question** in the chat UI
4. The backend **retrieves the most relevant chunks** using cosine similarity search
5. **Gemini 2.5 Flash** generates a grounded, cited answer and **streams it token by token** back to the browser via Server-Sent Events
6. Sources are shown as expandable pill chips below each answer

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL + pgvector (HNSW index, 768-dim vectors) |
| **ORM** | Drizzle ORM |
| **Queue / Worker** | BullMQ + Redis |
| **Cache** | Redis (embedding cache, RAG answer cache) |
| **Embeddings** | Google `gemini-embedding-001` (768 dimensions) |
| **Generation** | Google `gemini-2.5-flash` (streaming) |
| **Auth** | JWT, bcrypt password hashing |
| **Infra** | Docker Compose (Postgres + Redis) |

---

## Architecture

```
Browser
  │
  ├─ Upload file ──► POST /documents ──► multer ──► BullMQ queue
  │                                                       │
  │                                                 Ingestion Worker
  │                                                  ├─ parse (pdf-parse)
  │                                                  ├─ chunk (recursive splitter, 1500 chars / 200 overlap)
  │                                                  ├─ embed (gemini-embedding-001, batch=100)
  │                                                  └─ store chunks + vectors → pgvector
  │
  └─ Ask question ──► GET /chat/:id?q=... (SSE)
                          │
                          ├─ embed question → check Redis cache
                          ├─ pgvector cosine similarity search (<=> operator)
                          ├─ stream "sources" event → browser
                          ├─ build grounded prompt with retrieved context
                          └─ stream tokens from Gemini 2.5 Flash → browser
```

---

## Features

- **Streaming chat** — tokens appear word by word as Gemini generates them, with a live cursor
- **Semantic search** — HNSW vector index on pgvector for fast cosine similarity retrieval
- **Async ingestion** — BullMQ worker processes documents in the background; dashboard polls for status
- **Redis caching** — embeddings and RAG answers cached to avoid redundant API calls
- **Source citations** — model cites `[Source N]` in answers; UI renders them as expandable pill chips
- **Markdown rendering** — responses render code blocks, bold, lists, and headings via react-markdown + remark-gfm
- **JWT auth** — signup / login with bcrypt-hashed passwords, protected routes on both frontend and backend
- **RAGAS-inspired evals** — built-in eval runner scores answers on faithfulness, relevancy, and context precision using Gemini as judge
- **File type support** — PDF (pdf-parse), plain text, and Markdown

---

## Project Structure

```
docchat/
├── backend/
│   └── src/
│       ├── routes/         # auth, documents, chat (SSE)
│       ├── services/       # authService, documentService, retrievalService
│       ├── workers/        # ingestionWorker (BullMQ)
│       ├── lib/            # chunker, embeddings, generation, cache, queue, jwt
│       ├── db/             # Drizzle schema + client
│       ├── middleware/     # requireAuth, errorHandler
│       ├── validators/     # Zod request schemas
│       └── evals/          # RAGAS-style eval runner + metrics
├── frontend/
│   └── src/
│       ├── pages/          # LoginPage, SignupPage, DashboardPage, ChatPage
│       ├── components/     # Layout, ProtectedRoute, shadcn/ui primitives
│       ├── api/            # typed fetch clients (auth, documents)
│       ├── lib/            # SSE streaming client
│       └── context/        # AuthContext (JWT storage + user state)
└── docker-compose.yml      # Postgres (pgvector) + Redis
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- A [Google AI Studio](https://aistudio.google.com) API key (free tier works)

### 1. Start infrastructure

```bash
docker compose up -d
```

Spins up PostgreSQL with the pgvector extension and Redis.

### 2. Backend

```bash
cd backend
cp .env.example .env     # add your GEMINI_API_KEY and JWT_SECRET
npm install
npm run db:push          # run migrations
npm run dev              # http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

### Environment variables

```env
DATABASE_URL=postgresql://docchat:docchat@localhost:5432/docchat
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here
PORT=3000
```

---

## Eval System

The project includes a built-in evaluation runner inspired by [RAGAS](https://docs.ragas.io/en/stable/).

```bash
cd backend
npm run eval
```

Scores each answer using Gemini as a judge across three metrics:

| Metric | What it measures |
|---|---|
| **Faithfulness** | Are all claims in the answer grounded in the retrieved context? |
| **Answer Relevancy** | Does the answer actually address the question asked? |
| **Context Precision** | Are the retrieved chunks relevant to the question? |

---

## License

MIT
