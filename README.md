# MJP CERAMICS Showroom

Interactive 3D tile showroom for **MJP CERAMICS, Tiruverumbur**. Customers can explore four connected rooms, apply floor and wall tiles, customise each wall individually, upload tile textures, and use WebXR-compatible VR headsets.

## Project structure

```text
frontend/   React + TypeScript + Vite + Tailwind + Three.js/WebXR
backend/    FastAPI + PostgreSQL + Alembic tile-design API
```

## Local development

### 1. Start PostgreSQL

```powershell
cd C:\tiles-showroom
docker compose up -d db
```

### 2. Start the API

```powershell
cd C:\tiles-showroom\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Start the frontend

In a second terminal:

```powershell
cd C:\tiles-showroom\frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment files

- Copy `frontend/.env.example` to `frontend/.env`, then set `VITE_API_URL`.
- Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL`, CORS and VR settings.

For a hosted production site, use the HTTPS API URL in `frontend/.env` and include the website domain in `backend/.env` under `CORS_ORIGINS` and `VR_ALLOWED_ORIGINS`.

## Commands

```powershell
# Frontend production build
cd C:\tiles-showroom\frontend
npm run build

# Frontend browser checks
npm run test:e2e

# API health check after starting Uvicorn
Invoke-RestMethod http://localhost:8000/api/health
```

## VR

The headset experience uses browser WebXR. `localhost` is suitable for development; deployed headset use needs HTTPS. See [backend/README.md](backend/README.md) for `VR_*` configuration.

## Credits

Third-party 3D/HDR assets and their licenses are documented in [frontend/public/ASSET_CREDITS.txt](frontend/public/ASSET_CREDITS.txt).
