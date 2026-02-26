from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

ACTIVE_JD = {"text": None}

class JDRequest(BaseModel):
    jd_text: str


@router.post("/jd/set")
def set_job_description(req: JDRequest):
    ACTIVE_JD["text"] = req.jd_text
    return {"message": "Job description set"}


@router.get("/jd/get")
def get_job_description():
    return ACTIVE_JD
