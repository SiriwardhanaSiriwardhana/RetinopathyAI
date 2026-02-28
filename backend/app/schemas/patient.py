"""
Pydantic schemas for Patient request & response bodies.
"""

from pydantic import BaseModel
from datetime import datetime


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str | None = None
    diabetes_type: str | None = None


class PatientOut(BaseModel):
    id: int
    name: str
    age: int
    gender: str | None = None
    diabetes_type: str | None = None
    doctor_id: int
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
