"""
SQLAlchemy models – RetinalScan & Diagnosis.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class RetinalScan(Base):
    __tablename__ = "retinal_scans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    image_path = Column(String(500), nullable=False)
    upload_date = Column(DateTime, server_default=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="scans")
    diagnosis = relationship("Diagnosis", back_populates="scan", uselist=False)


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("retinal_scans.id"), unique=True, nullable=False)
    dr_stage = Column(String(50), nullable=False)   # No DR, Mild, Moderate, Severe, Proliferative
    confidence = Column(Float, nullable=False)
    details = Column(String(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    scan = relationship("RetinalScan", back_populates="diagnosis")
