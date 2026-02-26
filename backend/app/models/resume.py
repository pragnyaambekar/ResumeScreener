from sqlalchemy import Column, String, DateTime, Enum, Float, Text, JSON
from datetime import datetime
from app.database import Base

class Resume(Base):
    __tablename__ = "resumes"

    resume_id = Column(String(50), primary_key=True, index=True)
    candidate_name = Column(String(200), nullable=True)
    jd_hash = Column(String(64), nullable=True)  # Hash of JD for grouping
    status = Column(
        Enum(
            "UPLOADED",
            "PROCESSING",
            "INVALID_RESUME",
            "PROCESSED",
            "ERROR"
        ),
        default="UPLOADED"
    )
    upload_time = Column(DateTime, default=datetime.utcnow)
    quality_score = Column(Float, nullable=True)
    final_score = Column(Float, nullable=True)
    decision = Column(String(20), nullable=True)
    error_message = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    skill_data = Column(JSON, nullable=True)
    file_path = Column(String(500), nullable=True)
