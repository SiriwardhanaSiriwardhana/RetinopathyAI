"""
Pydantic schemas for RetinalScan & Diagnosis response bodies.
"""

from pydantic import BaseModel
from datetime import datetime


class ScanOut(BaseModel):
    id: int
    patient_id: int
    image_path: str
    upload_date: datetime | None = None

    model_config = {"from_attributes": True}


class DiagnosisOut(BaseModel):
    id: int
    scan_id: int
    dr_stage: str
    confidence: float
    details: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PredictionResult(BaseModel):
    scan_id: int
    dr_stage: str
    confidence: float
    details: str | None = None
