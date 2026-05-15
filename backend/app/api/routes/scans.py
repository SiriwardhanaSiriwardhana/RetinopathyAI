"""
Retinal scan upload and AI prediction routes (Firestore).
"""

import os
import uuid
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from google.cloud import firestore

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.user import UserOut
from app.schemas.scan import ScanOut, DiagnosisOut, PredictionResult
from app.services.ml_service import ml_service
from app.services.openai_service import get_clinical_recommendation

router = APIRouter(prefix="/api/scans", tags=["Scans"])

UPLOAD_PATH = Path(settings.UPLOAD_DIR)

@router.get("/", response_model=list[dict])
def get_scans(
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Retrieve all scans for patients belonging to the current doctor."""
    # First, get all patients for this doctor
    patients_ref = db.collection("patients").where("doctor_id", "==", current_user.id).stream()
    patient_map = {doc.id: doc.to_dict().get("name", "Unknown") for doc in patients_ref}
    
    if not patient_map:
        return []
        
    # Then get all scans for these patients
    scans = []
    scans_ref = db.collection("scans").stream()
    for doc in scans_ref:
        data = doc.to_dict()
        patient_id = data.get("patient_id")
        if patient_id in patient_map:
            # Serialize Firestore Timestamp to ISO string
            upload_date = data.get("upload_date", "")
            if hasattr(upload_date, "isoformat"):
                upload_date = upload_date.isoformat()
            elif hasattr(upload_date, "timestamp"):
                from datetime import datetime as _dt, timezone as _tz
                upload_date = _dt.fromtimestamp(upload_date.timestamp(), tz=_tz.utc).isoformat()
            else:
                upload_date = str(upload_date) if upload_date else ""

            scans.append({
                "id": doc.id,
                "imageId": doc.id,
                "patientId": patient_id,
                "patientName": patient_map[patient_id],
                "imagePath": data.get("image_path", ""),
                "uploadDate": upload_date,
                "status": data.get("status", "analyzed")
            })
    return scans


@router.get("/by-patient/{patient_id}", response_model=list[dict])
def get_scans_by_patient(
    patient_id: str,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Retrieve all scans for a specific patient."""
    patient_doc = db.collection("patients").document(patient_id).get()
    if not patient_doc.exists or patient_doc.to_dict().get("doctor_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Patient not found")

    scans = []
    scans_ref = db.collection("scans").where("patient_id", "==", patient_id).stream()
    for doc in scans_ref:
        data = doc.to_dict()
        scans.append({
            "id": doc.id,
            "imageId": doc.id,
            "patientId": patient_id,
            "imagePath": data.get("image_path", ""),
            "uploadDate": data.get("upload_date", ""),
            "status": data.get("status", "pending"),
        })
    return scans

@router.post("/upload", response_model=ScanOut, status_code=status.HTTP_201_CREATED)
async def upload_scan(
    patient_id: str,
    file: UploadFile = File(...),
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Upload a retinal fundus image for a patient."""
    patient_doc = db.collection("patients").document(patient_id).get()
    if not patient_doc.exists or patient_doc.to_dict().get("doctor_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/tiff"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}")

    # Save file
    UPLOAD_PATH.mkdir(parents=True, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_PATH / filename

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    doc_ref = db.collection("scans").document()
    scan_data = {
        "patient_id": patient_id,
        "image_path": str(file_path),
        "upload_date": datetime.now(timezone.utc),
        "status": "pending"
    }
    doc_ref.set(scan_data)
    
    return ScanOut(id=doc_ref.id, **scan_data)


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(
    scan_id: str,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Retrieve a scan by ID."""
    doc = db.collection("scans").document(scan_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    # Optional: Validate patient belongs to user
    data = doc.to_dict()
    return ScanOut(id=doc.id, **data)


# ✨ AI Prediction ✨
predict_router = APIRouter(prefix="/api", tags=["AI Prediction"])

@predict_router.post("/predict", response_model=PredictionResult)
def run_prediction(
    scan_id: str,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Run AI diagnosis on a retinal scan."""
    scan_ref = db.collection("scans").document(scan_id)
    scan_doc = scan_ref.get()
    
    if not scan_doc.exists:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    scan_data = scan_doc.to_dict()

    try:
        dr_stage, confidence, details, heatmap_filename = ml_service.predict(scan_data["image_path"])
    except Exception as e:
        scan_ref.update({"status": "failed"})
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    # Update scan status
    scan_ref.update({"status": "analyzed"})

    # Get AI clinical recommendation (OpenAI GPT)
    ai_recommendation = get_clinical_recommendation(dr_stage, confidence, details)

    # Persist result
    diag_ref = db.collection("diagnoses").document()
    diag_data = {
        "scan_id": scan_id,
        "patient_id": scan_data["patient_id"],
        "dr_stage": dr_stage,
        "confidence": confidence,
        "details": details,
        "ai_recommendation": ai_recommendation,
        "heatmap_path": heatmap_filename,
        "created_at": datetime.now(timezone.utc)
    }
    diag_ref.set(diag_data)

    return PredictionResult(
        scan_id=scan_id,
        dr_stage=dr_stage,
        confidence=confidence,
        details=details,
        heatmap_path=heatmap_filename,
    )

@predict_router.get("/diagnosis/{report_id}", response_model=DiagnosisOut)
def get_diagnosis(
    report_id: str,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    doc = db.collection("diagnoses").document(report_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    return DiagnosisOut(id=doc.id, **doc.to_dict())

@predict_router.get("/diagnosis/scan/{scan_id}", response_model=DiagnosisOut)
def get_diagnosis_by_scan(
    scan_id: str,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    docs = list(db.collection("diagnoses").where("scan_id", "==", scan_id).limit(1).stream())
    if not docs:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    return DiagnosisOut(id=docs[0].id, **docs[0].to_dict())
