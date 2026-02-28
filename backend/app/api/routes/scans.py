"""
Retinal scan upload and AI prediction routes.
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.scan import RetinalScan, Diagnosis
from app.schemas.scan import ScanOut, DiagnosisOut, PredictionResult

router = APIRouter(prefix="/api/scans", tags=["Scans"])

UPLOAD_PATH = Path(settings.UPLOAD_DIR)


@router.post("/upload", response_model=ScanOut, status_code=status.HTTP_201_CREATED)
async def upload_scan(
    patient_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a retinal fundus image for a patient."""
    # Verify patient belongs to doctor
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.doctor_id == current_user.id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/tiff"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
        )

    # Save file
    UPLOAD_PATH.mkdir(parents=True, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_PATH / filename

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Create DB record
    scan = RetinalScan(patient_id=patient_id, image_path=str(file_path))
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a scan by ID."""
    scan = db.query(RetinalScan).filter(RetinalScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


# ── AI Prediction ────────────────────────────────────────
predict_router = APIRouter(prefix="/api", tags=["AI Prediction"])


@predict_router.post("/predict", response_model=PredictionResult)
def run_prediction(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run AI diagnosis on a retinal scan.
    NOTE: This is a placeholder – replace the mock logic with your
    trained CNN model inference (TensorFlow / PyTorch) in Phase 2.
    """
    scan = db.query(RetinalScan).filter(RetinalScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # ── Placeholder AI inference ─────────────────────────
    # TODO: Replace with actual model prediction
    dr_stage = "No DR"
    confidence = 0.0
    details = "Placeholder – integrate your trained CNN model here."
    # ─────────────────────────────────────────────────────

    # Persist result
    diagnosis = Diagnosis(
        scan_id=scan.id,
        dr_stage=dr_stage,
        confidence=confidence,
        details=details,
    )
    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)

    return PredictionResult(
        scan_id=scan.id,
        dr_stage=dr_stage,
        confidence=confidence,
        details=details,
    )
