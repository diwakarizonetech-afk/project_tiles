from contextlib import asynccontextmanager
from pathlib import Path
import re
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import ALLOWED_IMAGE_TYPES, CORS_ORIGINS, MAX_UPLOAD_BYTES, UPLOAD_DIR, VR_ALLOWED_ORIGINS, VR_DEFAULT_MOVEMENT_SPEED, VR_ENABLED, VR_REQUIRE_HTTPS, VR_ROOM_SCALE, VR_TELEPORT_ENABLED
from .database import Base, engine, get_db
from .models import TileDesign
from .schemas import TileDesignOut, VrSettingsOut

CODE_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9-]{2,24}$")
FAMILIES = {"Marble", "Stone", "Terrazzo", "Wood", "Pattern"}
SURFACES = {"Floor", "Wall", "Both"}

@asynccontextmanager
async def lifespan(_: FastAPI):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app = FastAPI(title="MJP Ceramics API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False, allow_methods=["GET", "POST", "DELETE"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def serialize(design: TileDesign, request: Request) -> TileDesignOut:
    return TileDesignOut(code=design.code, name=design.name, family=design.family, finish=design.finish, surface=design.surface, image_url=str(request.base_url).rstrip("/") + design.image_path, created_at=design.created_at)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/vr-settings", response_model=VrSettingsOut)
def vr_settings():
    """Public WebXR settings consumed by the showroom client at runtime."""
    return VrSettingsOut(
        enabled=VR_ENABLED,
        require_https=VR_REQUIRE_HTTPS,
        teleport_enabled=VR_TELEPORT_ENABLED,
        default_movement_speed=VR_DEFAULT_MOVEMENT_SPEED,
        room_scale=VR_ROOM_SCALE,
        allowed_origins=VR_ALLOWED_ORIGINS,
    )

@app.get("/api/tile-designs", response_model=list[TileDesignOut])
def list_tile_designs(request: Request, db: Session = Depends(get_db)):
    designs = db.scalars(select(TileDesign).order_by(TileDesign.created_at.desc())).all()
    return [serialize(design, request) for design in designs]

@app.post("/api/tile-designs", response_model=TileDesignOut, status_code=status.HTTP_201_CREATED)
async def create_tile_design(
    request: Request,
    code: str = Form(...),
    name: str = Form(...),
    family: str = Form(...),
    finish: str = Form("Matt"),
    surface: str = Form("Both"),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    code = code.strip().upper()
    if not CODE_PATTERN.fullmatch(code):
        raise HTTPException(status_code=422, detail="Tile code must contain 3-25 uppercase letters, numbers or hyphens.")
    if family not in FAMILIES or surface not in SURFACES:
        raise HTTPException(status_code=422, detail="Invalid family or surface type.")
    extension = ALLOWED_IMAGE_TYPES.get(image.content_type or "")
    if not extension:
        raise HTTPException(status_code=415, detail="Use a JPG, PNG or WebP texture image.")
    payload = await image.read()
    if not payload or len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be between 1 byte and 5 MB.")
    filename = f"{uuid4().hex}{extension}"
    target = UPLOAD_DIR / filename
    target.write_bytes(payload)
    design = TileDesign(code=code, name=name.strip(), family=family, finish=finish.strip() or "Matt", surface=surface, image_path=f"/uploads/{filename}")
    db.add(design)
    try:
        db.commit()
        db.refresh(design)
    except IntegrityError:
        db.rollback()
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=409, detail=f"Tile code {code} already exists.")
    return serialize(design, request)

@app.delete("/api/tile-designs/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tile_design(code: str, db: Session = Depends(get_db)):
    design = db.get(TileDesign, code.upper())
    if not design:
        raise HTTPException(status_code=404, detail="Tile design not found.")
    image = UPLOAD_DIR / Path(design.image_path).name
    db.delete(design)
    db.commit()
    image.unlink(missing_ok=True)
