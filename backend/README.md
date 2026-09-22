# MJP Ceramics API

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
