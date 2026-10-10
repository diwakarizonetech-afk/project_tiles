from datetime import datetime
from typing import Literal
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
    orientation: Literal["Landscape", "Portrait"] = "Landscape"
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

class InquiryIn(BaseModel):
    name: str
    contact: str
    message: str

class InquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    contact: str
    message: str
    created_at: datetime
