"""
Prescription management routes — create & retrieve prescriptions stored in Firestore.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.user import UserOut
from app.schemas.prescription import PrescriptionCreate, PrescriptionOut
from app.services.openai_service import get_prescription_suggestion

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])


@router.get("/ai-suggestion/{scan_id}")
def get_ai_prescription_suggestion(
    scan_id: str,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Generate an AI-powered prescription suggestion for a given scan.
    Fetches the diagnosis + patient details, then calls OpenAI GPT-4o.
    """
    # Fetch diagnosis
    diag_docs = list(
        db.collection("diagnoses").where("scan_id", "==", scan_id).limit(1).stream()
    )
    if not diag_docs:
        raise HTTPException(status_code=404, detail="Diagnosis not found for this scan")

    diag_data = diag_docs[0].to_dict()

    # Fetch patient details for richer context
    patient_id = diag_data.get("patient_id", "")
    patient_age = None
    diabetes_type = None
    if patient_id:
        patient_doc = db.collection("patients").document(patient_id).get()
        if patient_doc.exists:
            p = patient_doc.to_dict()
            patient_age = p.get("age")
            diabetes_type = p.get("diabetes_type")

    suggestion = get_prescription_suggestion(
        dr_stage=diag_data.get("dr_stage", ""),
        confidence=diag_data.get("confidence", 0.0),
        details=diag_data.get("details", ""),
        patient_age=patient_age,
        diabetes_type=diabetes_type,
    )
    return suggestion


@router.post("/", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def create_or_update_prescription(
    payload: PrescriptionCreate,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Create or overwrite a prescription for a given diagnosis."""
    # Verify the diagnosis exists and belongs to this doctor
    docs = list(
        db.collection("diagnoses")
        .where("scan_id", "==", payload.scan_id)
        .limit(1)
        .stream()
    )
    if not docs:
        raise HTTPException(status_code=404, detail="Diagnosis not found")

    diag_data = docs[0].to_dict()
    patient_id = diag_data.get("patient_id", "")

    now = datetime.now(timezone.utc)

    # Check if a prescription already exists for this diagnosis
    existing = list(
        db.collection("prescriptions")
        .where("diagnosis_id", "==", payload.diagnosis_id)
        .limit(1)
        .stream()
    )

    prescription_data = {
        "scan_id": payload.scan_id,
        "diagnosis_id": payload.diagnosis_id,
        "patient_id": patient_id,
        "doctor_id": current_user.id,
        "doctor_notes": payload.doctor_notes,
        "medicines": [m.model_dump() for m in payload.medicines],
        "updated_at": now,
    }

    if existing:
        doc_ref = db.collection("prescriptions").document(existing[0].id)
        doc_ref.update(prescription_data)
        doc_id = existing[0].id
        prescription_data["created_at"] = existing[0].to_dict().get("created_at")
    else:
        prescription_data["created_at"] = now
        doc_ref = db.collection("prescriptions").document()
        doc_ref.set(prescription_data)
        doc_id = doc_ref.id

    return PrescriptionOut(id=doc_id, **prescription_data)


@router.get("/{diagnosis_id}", response_model=PrescriptionOut)
def get_prescription(
    diagnosis_id: str,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Get the prescription for a given diagnosis ID."""
    docs = list(
        db.collection("prescriptions")
        .where("diagnosis_id", "==", diagnosis_id)
        .limit(1)
        .stream()
    )
    if not docs:
        raise HTTPException(status_code=404, detail="No prescription found for this diagnosis")

    data = docs[0].to_dict()
    return PrescriptionOut(id=docs[0].id, **data)
