"""
Patient management routes — CRUD operations for patients (Firestore).
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.user import UserOut
from app.schemas.patient import PatientCreate, PatientOut

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("/", response_model=list[PatientOut])
def get_patients(
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """List all patients belonging to the current doctor."""
    docs = db.collection("patients").where("doctor_id", "==", current_user.id).stream()
    
    patients = []
    for doc in docs:
        data = doc.to_dict()
        patients.append(PatientOut(id=doc.id, **data))
    return patients


@router.post("/", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Add a new patient record."""
    doc_ref = db.collection("patients").document()
    
    patient_data = payload.model_dump()
    patient_data["doctor_id"] = current_user.id
    patient_data["created_at"] = datetime.now(timezone.utc)
    
    doc_ref.set(patient_data)
    
    return PatientOut(id=doc_ref.id, **patient_data)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: str,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """Get a single patient by ID."""
    doc = db.collection("patients").document(patient_id).get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    data = doc.to_dict()
    if data.get("doctor_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    return PatientOut(id=doc.id, **data)
