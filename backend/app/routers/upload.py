from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends
from typing import List
import uuid
import os

from sqlalchemy.orm import Session
from fastapi import Form
from app.database import get_db
from app.models.resume import Resume
from app.workers.resume_worker import process_resume_async
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(max_workers=2)



router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

os.makedirs(UPLOAD_DIR, exist_ok=True)


def is_allowed_file(filename: str) -> bool:
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)


@router.post("/resumes/upload")
async def upload_resumes(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    responses = []

    for file in files:

        # ---------- File type validation ----------
        if not file.filename or not is_allowed_file(file.filename):
            responses.append({
                "filename": file.filename,
                "status": "REJECTED",
                "reason": "Unsupported file type"
            })
            continue

        resume_id = f"RES_{uuid.uuid4().hex[:8].upper()}"
        file_path = os.path.join(UPLOAD_DIR, f"{resume_id}_{file.filename}")

        # ---------- Save file safely ----------
        try:
            content = await file.read()
            file.file.seek(0)

            if not content:
                raise ValueError("Empty file")
            
            # ---------- File size validation ----------
            if len(content) > MAX_FILE_SIZE:
                responses.append({
                    "filename": file.filename,
                    "status": "REJECTED",
                    "reason": f"File too large (max 10MB, got {len(content) / 1024 / 1024:.2f}MB)"
                })
                continue

            with open(file_path, "wb") as f:
                f.write(content)

        except Exception:
            responses.append({
                "filename": file.filename,
                "status": "REJECTED",
                "reason": "Corrupt or unreadable file"
            })
            continue

        # ---------- DB entry ----------
        try:
            resume = Resume(
                resume_id=resume_id,
                status="PROCESSING"  # MUST MATCH ENUM EXACTLY
            )
            db.add(resume)
            db.commit()
            db.refresh(resume)  # 🔥 VERY IMPORTANT
        except Exception as db_error:
            db.rollback()
            responses.append({
                "filename": file.filename,
                "status": "ERROR",
                "reason": "Database error"
            })
            continue

        # ---------- Trigger async pipeline ----------
        try:
            executor.submit(
                process_resume_async,
                resume_id,
                file_path
            )
            
            responses.append({
                "resume_id": resume_id,
                "status": "ACCEPTED"
            })
        except Exception:
            resume.status = "ERROR"
            db.commit()
            responses.append({
                "filename": file.filename,
                "status": "ERROR",
                "reason": "Failed to start processing"
            })

    return {
        "message": "UPLOAD_COMPLETE",
        "results": responses
    }


@router.post("/analyze")
async def analyze_resumes(
    files: List[UploadFile] = File(...),
    jd_text: str = Form(...),
    db: Session = Depends(get_db)
):
    results = []
    
    # Generate hash of JD for grouping
    import hashlib
    jd_hash = hashlib.md5(jd_text.encode()).hexdigest()[:16]

    for file in files:
        # Validate file type
        if not file.filename or not is_allowed_file(file.filename):
            results.append({
                "filename": file.filename,
                "status": "REJECTED",
                "reason": "Unsupported file type"
            })
            continue

        try:
            content = await file.read()
            
            # Validate file size
            if len(content) > MAX_FILE_SIZE:
                results.append({
                    "filename": file.filename,
                    "status": "REJECTED",
                    "reason": f"File too large (max 10MB, got {len(content) / 1024 / 1024:.2f}MB)"
                })
                continue
            
            if not content:
                results.append({
                    "filename": file.filename,
                    "status": "REJECTED",
                    "reason": "Empty file"
                })
                continue

            # Quick name extraction for ID generation
            from app.utils.name_extractor import extract_candidate_name, generate_resume_id
            from app.pipeline.ingestion import extract_text_from_pdf
            
            # Save temp file to extract name
            temp_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4().hex[:8]}.pdf")
            with open(temp_path, "wb") as f:
                f.write(content)
            
            try:
                # Extract text and name
                text = extract_text_from_pdf(temp_path)
                candidate_name = extract_candidate_name(text) if text else "Unknown"
                resume_id = generate_resume_id(candidate_name)
            except Exception:
                # Fallback to old format if extraction fails
                candidate_name = "Unknown"
                resume_id = f"RES_{uuid.uuid4().hex[:8].upper()}"
            
            # Rename to final path
            file_path = os.path.join(UPLOAD_DIR, f"{resume_id}.pdf")
            os.rename(temp_path, file_path)

            resume = Resume(
                resume_id=resume_id,
                candidate_name=candidate_name,
                jd_hash=jd_hash,
                status="PROCESSING"
            )
            db.add(resume)
            db.commit()

            # Background processing
            executor.submit(process_resume_background, resume_id, file_path, jd_text)

            results.append({
                "resume_id": resume_id,
                "candidate_name": candidate_name,
                "jd_hash": jd_hash,
                "status": "PROCESSING"
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "ERROR",
                "reason": str(e)
            })

    return {
        "message": "Processing started",
        "resumes": results
    }

def process_resume_background(resume_id, file_path, jd_text):
    from app.database import SessionLocal
    db = SessionLocal()
    print(f"Started processing {resume_id}")

    try:
        from app.pipeline.jd_intelligence import jd_stage
        jd_data = jd_stage(jd_text)

        process_resume_async(resume_id, file_path, jd_data)

    except Exception as e:
        print(f"ERROR in background processing {resume_id}: {e}")
        resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
        if resume:
            resume.status = "ERROR"
            db.commit()
        
        # Clean up file on error
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass
    finally:
        print(f"Finished processing {resume_id}")
        db.close()
