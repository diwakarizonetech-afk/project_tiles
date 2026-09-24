# MJP Ceramics API

## Dynamic tile catalog

PostgreSQL is the single source of truth for all 30 floor tiles, 12 wall tiles, and customer uploads. Alembic revision `20260923_0002` adds the catalog fields and seeds the built-in products. Their original images are served by FastAPI from `/catalog`; uploaded products are served from `/uploads`. The React app no longer contains a static product catalog or procedural tile fallback.

After pulling this version, start Docker Desktop and run:

```powershell
docker compose up --build
```

For a non-Docker backend, run `alembic upgrade head` before starting Uvicorn. Set `CATALOG_DIR` if the catalog images live outside `backend/catalog`.

## VR / WebXR configuration

The 3D scene and headset connection run in the browser through WebXR. FastAPI publishes deployment settings at `GET /api/vr-settings`; change the `VR_*` values in `backend/.env`, then restart Uvicorn.

- `VR_ENABLED` — enable or temporarily disable headset entry.
- `VR_REQUIRE_HTTPS` — keep `true` in production; WebXR works on `localhost` during development.
- `VR_TELEPORT_ENABLED`, `VR_DEFAULT_MOVEMENT_SPEED`, `VR_ROOM_SCALE` — visitor movement and world-scale defaults.
- `VR_ALLOWED_ORIGINS` — comma-separated production domains allowed to read the VR settings.

Start the complete local stack from the repository root:

```powershell
docker compose up --build
```

API documentation: `http://localhost:8000/docs`

Run migrations manually from this directory:

```powershell
alembic upgrade head
```
