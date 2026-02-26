from sqlalchemy.orm import Session
from app.database import SessionLocal
import os

from app.models.resume import Resume

# Pipeline engines (we will implement these one by one)
from app.pipeline.ingestion import ingestion_stage
from app.pipeline.document_intelligence import document_intelligence_stage
from app.pipeline.segmentation import segmentation_stage
from app.pipeline.grammar_engine import grammar_stage
from app.pipeline.semantic_role_engine import semantic_role_stage
from app.pipeline.discourse_engine import discourse_stage
from app.pipeline.section_behavior_engine import section_behavior_stage
from app.pipeline.consistency_engine import consistency_stage
from app.pipeline.quality_gate import quality_gate_stage
from app.pipeline.ner_engine import ner_stage
from app.pipeline.skill_intelligence import skill_intelligence_stage
from app.pipeline.jd_intelligence import jd_stage
from app.pipeline.matching_engine import matching_stage
from app.pipeline.explanation_engine import explanation_stage


def process_resume_async(resume_id: str, file_path: str, jd_data: dict = None):
    
    db: Session = SessionLocal()
    if jd_data is None:
        jd_data = {}

    try:
        print(f"Started {resume_id}")

        resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()

        print("Stage 1 - ingestion")
        data = ingestion_stage(file_path)
        
        # Store extracted text for preview
        resume.extracted_text = data.get("raw_text", "")[:5000]  # Store first 5000 chars
        db.commit()
        
        print("Stage 2 - document_intelligence")
        data = document_intelligence_stage(data)
        
        print("Stage 3 - segmentation")
        data = segmentation_stage(data)
        
        print("Stage 4 - grammar")
        data = grammar_stage(data)
        
        print("Stage 5 - semantic_role")
        data = semantic_role_stage(data)
        
        print("Stage 6 - discourse")
        data = discourse_stage(data)
        
        print("Stage 7 - section_behavior")
        data = section_behavior_stage(data)
        
        print("Stage 8 - consistency")
        data = consistency_stage(data)

        print("Stage 9 - quality gate")
        is_valid, quality_score = quality_gate_stage(data)
        resume.quality_score = quality_score
        db.commit()

        if not is_valid:
            print(f"Resume failed quality gate with score {quality_score}")
            resume.status = "INVALID_RESUME"
            resume.decision = "REJECTED"
            
            # Add specific quality gate failure reason
            reasons = []
            if data.get("grammar_score", 0) < 0.20:
                reasons.append("Poor grammar quality")
            if data.get("semantic_role_score", 0) < 0.50:
                reasons.append("Weak sentence structure")
            if data.get("fragment_ratio", 0) > 0.60:
                reasons.append("Too many incomplete sentences")
            if quality_score < 0.45:
                reasons.append("Overall quality below threshold")
            
            resume.error_message = "Quality gate failed: " + ", ".join(reasons) if reasons else "Resume quality below minimum standards"
            db.commit()
            return

        print("Stage 10 - ner")
        data = ner_stage(data)
        
        # Store candidate name if not already set
        if not resume.candidate_name or resume.candidate_name == "Unknown":
            entities = data.get("entities", {})
            names = entities.get("names", [])
            if names:
                resume.candidate_name = names[0]
                db.commit()
        
        print("Stage 11 - skill_intelligence")
        data["jd_data"] = jd_data
        data = skill_intelligence_stage(data)
        
        print("Stage 12 - matching")
        final_score, final_score_data = matching_stage(data, jd_data)
        
        # Store skill matching data
        matched_skills = []
        missing_skills = []
        
        if jd_data.get("mandatory_skills"):
            skill_confidence = data.get("skill_confidence", {})
            for skill in jd_data["mandatory_skills"]:
                if skill_confidence.get(skill, 0) > 0.3:
                    matched_skills.append(skill)
                else:
                    missing_skills.append(skill)
        
        resume.skill_data = {
            "matched": matched_skills,
            "missing": missing_skills,
            "all_jd_skills": jd_data.get("mandatory_skills", []) + jd_data.get("optional_skills", [])[:5]
        }
        
        resume.status = "PROCESSED"
        resume.final_score = final_score
        resume.decision = final_score_data["decision"]
        resume.file_path = file_path  # Store file path for later viewing
        db.commit()

        # save engine scores
        import uuid
        from app.models.engine_score import EngineScore
        from app.models.explanation import Explanation

        scores_to_save = [
            EngineScore(id=uuid.uuid4().hex, resume_id=resume_id, engine="Skill Match", score=round(final_score_data.get("skill_score", 0) * 100, 2)),
            EngineScore(id=uuid.uuid4().hex, resume_id=resume_id, engine="Experience", score=round(final_score_data.get("experience_score", 0) * 100, 2)),
            EngineScore(id=uuid.uuid4().hex, resume_id=resume_id, engine="Education", score=round(final_score_data.get("education_score", 0) * 100, 2)),
            EngineScore(id=uuid.uuid4().hex, resume_id=resume_id, engine="Semantic Match", score=round(final_score_data.get("semantic_score", 0) * 100, 2)),
            EngineScore(id=uuid.uuid4().hex, resume_id=resume_id, engine="Quality Gate", score=round((resume.quality_score or 0) * 100, 2)),
        ]
        db.add_all(scores_to_save)

        for reason in final_score_data.get("reasons", []):
            db.add(Explanation(id=uuid.uuid4().hex, resume_id=resume_id, message=reason))

        db.commit()

        print(f"Finished {resume_id}")

    except Exception as e:
        print(f"ERROR in {resume_id}: {e}")
        import traceback
        traceback.print_exc()

        resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
        if resume:
            resume.status = "ERROR"
            # Store user-friendly error message
            error_msg = str(e)
            if "IngestionError" in str(type(e)):
                resume.error_message = f"File processing failed: {error_msg}"
            elif "QualityGateError" in str(type(e)):
                resume.error_message = f"Quality check failed: {error_msg}"
            elif "spaCy" in error_msg or "NLP" in error_msg:
                resume.error_message = "Text analysis failed. Please ensure the resume contains readable text."
            else:
                resume.error_message = f"Processing error: {error_msg}"
            db.commit()

    finally:
        db.close()
        
        # Don't delete file anymore - keep it for viewing
        # Optionally: Clean up files older than X days in a separate cleanup job
