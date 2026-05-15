"""
Pydantic schemas for RetinalScan & Diagnosis response bodies.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ScanOut(BaseModel):
    id: str
    patient_id: str
    image_path: str
    upload_date: datetime | None = None

    model_config = {"from_attributes": True}


class DiagnosisOut(BaseModel):
    id: str
    scan_id: str
    dr_stage: str
    confidence: float
    details: str | None = None
    heatmap_path: Optional[str] = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PredictionResult(BaseModel):
    scan_id: str
    dr_stage: str
    confidence: float
    details: str | None = None
    heatmap_path: Optional[str] = None
