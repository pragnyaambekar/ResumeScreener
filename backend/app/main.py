from fastapi import FastAPI
from app.database import engine, Base

from app.routers.upload import router as upload_router
from app.routers.status import router as status_router
from app.routers.results import router as results_router
from app.routers.jd import router as jd_router
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Resume Screening System",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(status_router, prefix="/api")
app.include_router(results_router, prefix="/api")
app.include_router(jd_router, prefix="/api")
