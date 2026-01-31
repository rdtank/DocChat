# DocChat

A multi-tenant, production RAG application.

Users sign up, upload documents (PDF / text / Markdown), and chat with their knowledge base — getting streamed, cited answers.

## Build progress

- [x] **Step 1 — Auth** (Day 15): signup/login, JWT, protected routes
- [ ] Step 2 — Document CRUD (scoped to owner)
- [ ] Step 3 — Background ingestion (chunk + embed + store)
- [ ] Step 4 — Retrieval + RAG (hybrid search, streamed cited answers)
- [ ] Step 5 — Chat UI
- [ ] Step 6 — Caching
- [ ] Step 7 — Evals
- [ ] Step 8 — Deploy + polish

## Architecture

```
docchat/
├── docker-compose.yml   # Postgres (with pgvector) for local dev
└── backend/             # Express + TypeScript, layered
    └── src/
        ├── config/      # env validation
        ├── db/          # drizzle schema + connection
        ├── lib/         # jwt, password hashing
        ├── middleware/  # requireAuth, error handler
        ├── routes/      # auth (documents, chat later)
        ├── services/    # authService (business logic)
        └── validators/  # zod request schemas
```

## Quick start

```bash
# 1. Start Postgres
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env       # already created for local dev
npm install
npm run db:push            # create tables
npm run dev                # http://localhost:4000
```

## Tech

Express · TypeScript · Drizzle ORM · Postgres (pgvector) · JWT · bcrypt · Zod
