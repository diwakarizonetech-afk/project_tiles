from datetime import datetime
from pydantic import BaseModel, ConfigDict

class VrSettingsOut(BaseModel):
    enabled: bool
    require_https: bool
    teleport_enabled: bool
    default_movement_speed: float
    room_scale: float
    allowed_origins: list[str]

class TileDesignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str
    family: str
    finish: str
    surface: str
    image_url: str
    color: str
    vein: str
    size: str
    normal_url: str | None = None
    roughness_url: str | None = None
    texture_repeat: float
    sort_order: int
    built_in: bool
    created_at: datetime
