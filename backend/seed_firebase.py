"""
Seed Firebase Firestore with synthetic data for testing.
"""

import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
import random

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import get_db
from app.core.security import hash_password

def seed_database():
    db = next(get_db())
    
    print("Seeding database...")
    
    # 1. Create a doctor user
    doctor_id = "test-doctor-123"
    doctor_ref = db.collection("users").document(doctor_id)
    doctor_ref.set({
        "name": "Dr. Sarah Miller",
        "email": "doctor@example.com",
        "hashed_password": hash_password("password123"),
        "role": "doctor",
        "created_at": datetime.now(timezone.utc) - timedelta(days=30)
    })
    print(f"Created doctor: doctor@example.com (password123)")
    
    # 2. Create synthetic patients
    first_names = ["James", "Maria", "Robert", "Emily", "Michael", "Linda", "William", "Elizabeth", "David", "Jennifer"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
    
    patients = []
    for i in range(10):
        patient_ref = db.collection("patients").document()
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        patient_data = {
            "name": name,
            "age": random.randint(45, 80),
            "gender": random.choice(["Male", "Female"]),
            "diabetes_type": random.choice(["Type 1", "Type 2", "Gestational"]),
            "doctor_id": doctor_id,
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
        }
        patient_ref.set(patient_data)
        patients.append((patient_ref.id, name))
        print(f"Created patient: {name}")
        
    # 3. Create synthetic scans and diagnoses
    dr_stages = ["No DR", "Mild NPDR", "Moderate NPDR", "Severe NPDR", "Proliferative DR"]
    
    for _ in range(25):
        patient_id, patient_name = random.choice(patients)
        
        # Scan
        scan_ref = db.collection("scans").document()
        upload_date = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30), hours=random.randint(0, 24))
        
        scan_ref.set({
            "patient_id": patient_id,
            "image_path": "/synthetic/path.jpg",
            "upload_date": upload_date,
            "status": "analyzed"
        })
        
        # Diagnosis
        diag_ref = db.collection("diagnoses").document()
        stage = random.choices(
            dr_stages, 
            weights=[0.4, 0.25, 0.2, 0.1, 0.05], 
            k=1
        )[0]
        
        diag_ref.set({
            "scan_id": scan_ref.id,
            "patient_id": patient_id,
            "dr_stage": stage,
            "confidence": random.uniform(0.75, 0.99),
            "details": f"Synthetic diagnosis finding: {stage} detected.",
            "created_at": upload_date + timedelta(minutes=random.randint(1, 5))
        })
        
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
