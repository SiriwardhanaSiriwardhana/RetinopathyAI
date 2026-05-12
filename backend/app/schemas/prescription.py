"""
Pydantic schemas for Prescription DTOs.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class MedicineItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    notes: Optional[str] = ""


class PrescriptionCreate(BaseModel):
    scan_id: str
    diagnosis_id: str
    doctor_notes: Optional[str] = ""
    medicines: List[MedicineItem] = []


class PrescriptionOut(BaseModel):
    id: str
    scan_id: str
    diagnosis_id: str
    patient_id: str
    doctor_id: str
    doctor_notes: Optional[str] = ""
    medicines: List[MedicineItem] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
