import uuid
from sqlalchemy.orm import Session
from app.models.explanation import Explanation


def explanation_stage(
    resume_id: str,
    reasons: list,
    db: Session
):
    """
    Stores explanation messages for a resume.
    Called after final decision or early rejection.
    """

    if not reasons:
        reasons = ["Resume meets all structural and job requirements"]

    for reason in reasons:
        explanation = Explanation(
            id=str(uuid.uuid4()),
            resume_id=resume_id,
            message=reason
        )
        db.add(explanation)

    db.commit()
