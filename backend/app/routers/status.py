from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.resume import Resume

router = APIRouter()

@router.get("/resumes")
def get_all_resumes(db: Session = Depends(get_db)):
    """Get all resumes from database"""
    resumes = db.query(Resume).order_by(Resume.upload_time.desc()).all()
    
    return {
        "resumes": [
            {
                "resume_id": r.resume_id,
                "candidate_name": r.candidate_name,
                "jd_hash": r.jd_hash,
                "status": r.status,
                "quality_score": r.quality_score,
                "final_score": r.final_score,
                "decision": r.decision,
                "error_message": r.error_message,
                "skill_data": r.skill_data,
                "upload_time": r.upload_time.isoformat() if r.upload_time else None
            }
            for r in resumes
        ]
    }

@router.get("/resumes/status/{resume_id}")
def get_resume_status(resume_id: str, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    return {
    "resume_id": resume.resume_id,
    "candidate_name": resume.candidate_name,
    "jd_hash": resume.jd_hash,
    "status": resume.status,
    "quality_score": resume.quality_score,
    "final_score": resume.final_score,
    "decision": resume.decision,
    "error_message": resume.error_message,
    "extracted_text": resume.extracted_text
}