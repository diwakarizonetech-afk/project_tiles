from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://alpha_tiles:alpha_tiles@db:5432/alpha_tiles")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]

def env_flag(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}

# WebXR itself runs in the visitor's browser/headset. These server-side values let
# the deployed showroom publish a single, safe configuration to every client.
VR_ENABLED = env_flag("VR_ENABLED", True)
VR_REQUIRE_HTTPS = env_flag("VR_REQUIRE_HTTPS", True)
VR_TELEPORT_ENABLED = env_flag("VR_TELEPORT_ENABLED", True)
VR_DEFAULT_MOVEMENT_SPEED = float(os.getenv("VR_DEFAULT_MOVEMENT_SPEED", "2.4"))
VR_ROOM_SCALE = float(os.getenv("VR_ROOM_SCALE", "1.0"))
VR_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("VR_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
