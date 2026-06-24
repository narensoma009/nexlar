# Nexlara

Azure OpenAI chat with CSV-based RAG. FastAPI + Vite/React/Tailwind, vector storage in Postgres (pgvector).

```
nexlara/
  backend/    FastAPI app — /api/chat, /api/documents
  frontend/   Vite + React 19 + Tailwind 4
  deploy/     Azure deployment scripts
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (for local Postgres) **or** an Azure Postgres Flexible Server with the `vector` extension
- Azure OpenAI resource with **two** deployments: a chat model (e.g. `gpt-4o`) and an embedding model (e.g. `text-embedding-3-small`)

## Local development

**1. Start Postgres with pgvector**

```powershell
cd nexlara
docker compose up -d
```

(Connects on `localhost:5432`, user/db `nexlara` / password `nexlara`.)

**2. Backend**

```powershell
cd nexlara\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# edit .env: endpoint, key, chat deployment, embedding deployment
uvicorn app.main:app --reload --port 8000
```

The app creates the `vector` extension and tables (`documents`, `chunks`) on first startup.

**3. Frontend**

```powershell
cd nexlara\frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Upload a CSV via the sidebar — each non-empty row becomes an embedded chunk. Chat queries are augmented with the top-K rows by cosine similarity.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET`  | `/api/health` | Liveness |
| `POST` | `/api/chat` | `{ messages, use_rag? }` → `{ reply, used_context }` |
| `GET`  | `/api/documents` | List uploaded documents |
| `POST` | `/api/documents` | Multipart `file=...csv` upload |
| `DELETE` | `/api/documents/{id}` | Remove a document and its chunks |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `AZURE_OPENAI_ENDPOINT` | AOAI resource endpoint |
| `AZURE_OPENAI_API_KEY` | AOAI key |
| `AZURE_OPENAI_DEPLOYMENT` | Chat model deployment name |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Embedding model deployment name |
| `AZURE_OPENAI_API_VERSION` | Defaults to `2024-10-21` |
| `DATABASE_URL` | `postgresql+psycopg2://user:pass@host:5432/db[?sslmode=require]` |
| `EMBEDDING_DIM` | Must match your embedding model dim (1536 default) |
| `RAG_TOP_K` | Number of chunks retrieved per query (5 default) |

> Changing `EMBEDDING_DIM` after the table exists requires dropping the `chunks` table — the column type is fixed at create time.

## Deploy to Azure

Provisions a single Linux App Service (B1) that serves both backend and frontend, plus a Postgres Flexible Server (B1ms) with `pgvector` enabled, all in `rde-pod6-rg`.

```powershell
az login
az account set --subscription "<your-subscription-id>"

# Edit values
notepad nexlara\deploy\variables.ps1

# One-shot deploy (idempotent — re-run after code changes)
nexlara\deploy\deploy.ps1
```

The script:
1. Creates the Postgres Flexible Server + `nexlara` DB + firewall rule (~5 min first time)
2. Allow-lists the `vector` extension at server level
3. Builds the React frontend and copies `dist` into `backend/static`
4. Creates the App Service plan + web app, sets startup + app settings
5. Zips and deploys the backend

Visit `https://<WEB_APP>.azurewebsites.net`. Health: `/api/health`.

Logs: `az webapp log tail --name <WEB_APP> --resource-group rde-pod6-rg`
