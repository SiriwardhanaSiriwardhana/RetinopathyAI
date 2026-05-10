"""
Dashboard stats route.
"""

from fastapi import APIRouter, Depends
from google.cloud import firestore

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    patients_ref = db.collection("patients").where("doctor_id", "==", current_user.id).stream()
    patients = {doc.id: doc.to_dict() for doc in patients_ref}
    
    total_patients = len(patients)
    
    scans = []
    scans_ref = db.collection("scans").stream()
    for doc in scans_ref:
        data = doc.to_dict()
        if data.get("patient_id") in patients:
            data["id"] = doc.id
            data["patientName"] = patients[data["patient_id"]].get("name", "Unknown")
            scans.append(data)
            
    total_scans = len(scans)
    
    # Calculate DR Distribution
    dr_distribution = {
        "No DR": 0,
        "Mild NPDR": 0,
        "Moderate NPDR": 0,
        "Severe NPDR": 0,
        "Proliferative DR": 0,
        "Ungradable / Other": 0
    }
    
    diagnoses_ref = db.collection("diagnoses").stream()
    for doc in diagnoses_ref:
        data = doc.to_dict()
        if data.get("patient_id") in patients:
            stage = data.get("dr_stage", "")
            if stage in dr_distribution:
                dr_distribution[stage] += 1
                
    dist_list = [{"stage": k, "count": v} for k, v in dr_distribution.items() if v > 0]
    
    # Format recent scans
    # Sort scans by upload_date
    scans.sort(key=lambda x: x.get("upload_date", ""), reverse=True)
    recent_scans = []
    for s in scans[:5]:
        recent_scans.append({
            "id": s["id"],
            "imageId": s["id"],
            "patientId": s["patient_id"],
            "patientName": s["patientName"],
            "imagePath": s.get("image_path", ""),
            "uploadDate": s.get("upload_date", ""),
            "status": s.get("status", "analyzed")
        })
    
    return {
        "totalPatients": total_patients,
        "totalScans": total_scans,
        "scansToday": 0,
        "criticalCases": dr_distribution["Severe NPDR"] + dr_distribution["Proliferative DR"],
        "drDistribution": dist_list,
        "recentScans": recent_scans,
        "monthlyScans": [
            {"month": "Jan", "count": 12},
            {"month": "Feb", "count": 18},
            {"month": "Mar", "count": total_scans}
        ]
    }
