from sqlalchemy import Column, String
from app.database import Base

class Explanation(Base):
    __tablename__ = "explanations"

    id = Column(String(50), primary_key=True)
    resume_id = Column(String(50), index=True)
    message = Column(String(500))
