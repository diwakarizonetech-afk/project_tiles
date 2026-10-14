from datetime import datetime
from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class TileDesign(Base):
    __tablename__ = "tile_designs"
    __table_args__ = (CheckConstraint("orientation IN ('Landscape', 'Portrait')", name="ck_tile_designs_orientation"),)

    code: Mapped[str] = mapped_column(String(25), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    family: Mapped[str] = mapped_column(String(30), nullable=False)
    finish: Mapped[str] = mapped_column(String(60), nullable=False)
    surface: Mapped[str] = mapped_column(String(10), nullable=False)
    orientation: Mapped[str] = mapped_column(String(10), default="Landscape", server_default="Landscape", nullable=False)
    image_path: Mapped[str] = mapped_column(Text, nullable=False)
    image_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    image_content_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str] = mapped_column(String(7), default="#d8d4cb", nullable=False)
    vein: Mapped[str] = mapped_column(String(7), default="#7e786f", nullable=False)
    size: Mapped[str] = mapped_column(String(60), default="Custom size", nullable=False)
    normal_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    roughness_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    texture_repeat: Mapped[float] = mapped_column(Float, default=2.8, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    built_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Inquiry(Base):
    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
