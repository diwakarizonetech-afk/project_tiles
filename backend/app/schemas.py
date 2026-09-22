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
    created_at: datetime
