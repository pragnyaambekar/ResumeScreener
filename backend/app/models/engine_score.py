from sqlalchemy import Column, String, Float
from app.database import Base

class EngineScore(Base):
    __tablename__ = "engine_scores"

    id = Column(String(50), primary_key=True)
    resume_id = Column(String(50), index=True)
    engine = Column(String(50))
    score = Column(Float)
