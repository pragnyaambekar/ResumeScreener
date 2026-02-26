from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.engine_score import EngineScore
from app.models.explanation import Explanation
from fastapi import HTTPException
from fastapi.responses import FileResponse
import os

router = APIRouter()

@router.get("/resumes/results/{resume_id}")
def get_resume_results(resume_id: str, db: Session = Depends(get_db)):
    from app.models.resume import Resume
    
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    
    engine_scores = db.query(EngineScore).filter(
        EngineScore.resume_id == resume_id
    ).all()

    explanations = db.query(Explanation).filter(
        Explanation.resume_id == resume_id
    ).all()

    return {
        "resume_id": resume_id,
        "engine_scores": [
            {"engine": e.engine, "score": e.score}
            for e in engine_scores
        ],
        "explanations": [e.message for e in explanations],
        "skill_data": resume.skill_data if resume else None
    }


@router.delete("/resumes/{resume_id}")
def delete_resume(resume_id: str, db: Session = Depends(get_db)):
    from app.models.resume import Resume
    
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Delete related records
    db.query(EngineScore).filter(EngineScore.resume_id == resume_id).delete()
    db.query(Explanation).filter(Explanation.resume_id == resume_id).delete()
    
    # Delete resume
    db.delete(resume)
    db.commit()
    
    return {"message": "Resume deleted successfully"}


@router.delete("/resumes")
def delete_all_resumes(db: Session = Depends(get_db)):
    from app.models.resume import Resume
    
    # Delete all related records
    db.query(EngineScore).delete()
    db.query(Explanation).delete()
    db.query(Resume).delete()
    
    db.commit()
    
    return {"message": "All resumes deleted successfully"}


@router.get("/resumes/file/{resume_id}")
def get_resume_file(resume_id: str):
    """Serve the uploaded resume file for viewing"""
    upload_dir = "uploads"
    
    # Find the file with this resume_id
    if os.path.exists(upload_dir):
        for filename in os.listdir(upload_dir):
            if filename.startswith(resume_id):
                file_path = os.path.join(upload_dir, filename)
                return FileResponse(
                    file_path,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": "inline; filename=" + filename
                    }
                )
    
    raise HTTPException(status_code=404, detail="Resume file not found")
