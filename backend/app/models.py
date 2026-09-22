from datetime import datetime
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class TileDesign(Base):
    __tablename__ = "tile_designs"

    code: Mapped[str] = mapped_column(String(25), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    family: Mapped[str] = mapped_column(String(30), nullable=False)
    finish: Mapped[str] = mapped_column(String(60), nullable=False)
    surface: Mapped[str] = mapped_column(String(10), nullable=False)
    image_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
