"""
Dashboard stats route — all data computed live from Firestore.
"""

from datetime import datetime, timezone, timedelta
from collections import defaultdict
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
    # ── 1. All patients for this doctor ──────────────────────
    patients_ref = db.collection("patients").where("doctor_id", "==", current_user.id).stream()
    patients = {doc.id: doc.to_dict() for doc in patients_ref}
    total_patients = len(patients)

    # ── 2. All scans belonging to those patients ──────────────
    scans = []
    scans_ref = db.collection("scans").stream()
    for doc in scans_ref:
        data = doc.to_dict()
        if data.get("patient_id") in patients:
            data["id"] = doc.id
            data["patientName"] = patients[data["patient_id"]].get("name", "Unknown")
            scans.append(data)

    total_scans = len(scans)

    # ── 3. Scans Today ───────────────────────────────────────
    now_utc = datetime.now(timezone.utc)
    # Start of today in UTC
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    scans_today = 0
    for s in scans:
        upload_date = s.get("upload_date")
        if upload_date:
            if isinstance(upload_date, str):
                try:
                    upload_dt = datetime.fromisoformat(upload_date.replace("Z", "+00:00"))
                except Exception:
                    continue
            elif hasattr(upload_date, "tzinfo"):
                upload_dt = upload_date if upload_date.tzinfo else upload_date.replace(tzinfo=timezone.utc)
            else:
                # Firestore DatetimeWithNanoseconds
                upload_dt = upload_date
            try:
                if upload_dt >= today_start:
                    scans_today += 1
            except Exception:
                pass

    # ── 4. DR Distribution & Critical Cases ──────────────────
    dr_distribution = {
        "No DR": 0,
        "Mild NPDR": 0,
        "Moderate NPDR": 0,
        "Severe NPDR": 0,
        "Proliferative DR": 0,
    }

    diagnoses_ref = db.collection("diagnoses").stream()
    for doc in diagnoses_ref:
        data = doc.to_dict()
        if data.get("patient_id") in patients:
            stage = data.get("dr_stage", "")
            if stage in dr_distribution:
                dr_distribution[stage] += 1

    dist_list = [{"stage": k, "count": v} for k, v in dr_distribution.items() if v > 0]
    critical_cases = dr_distribution["Severe NPDR"] + dr_distribution["Proliferative DR"]

    # ── 5. Monthly Scans — last 12 months ────────────────────
    monthly_counts: dict = defaultdict(int)

    # Generate labels for the last 12 months
    months_order = []
    for i in range(11, -1, -1):
        dt = now_utc - timedelta(days=i * 30)
        key = dt.strftime("%b %Y")   # e.g. "May 2026"
        short = dt.strftime("%b")    # e.g. "May"
        months_order.append((key, short))

    for s in scans:
        upload_date = s.get("upload_date")
        if not upload_date:
            continue
        try:
            if isinstance(upload_date, str):
                upload_dt = datetime.fromisoformat(upload_date.replace("Z", "+00:00"))
            elif hasattr(upload_date, "tzinfo"):
                upload_dt = upload_date if upload_date.tzinfo else upload_date.replace(tzinfo=timezone.utc)
            else:
                upload_dt = upload_date
            key = upload_dt.strftime("%b %Y")
            monthly_counts[key] += 1
        except Exception:
            continue

    monthly_scans = [
        {"month": short, "count": monthly_counts.get(full_key, 0)}
        for full_key, short in months_order
    ]

    # ── 6. Recent Scans ───────────────────────────────────────
    def sort_key(s):
        ud = s.get("upload_date", "")
        if ud and not isinstance(ud, str):
            try:
                return ud.isoformat()
            except Exception:
                pass
        return str(ud)

    scans.sort(key=sort_key, reverse=True)
    recent_scans = []
    for s in scans[:5]:
        ud = s.get("upload_date", "")
        if ud and not isinstance(ud, str):
            try:
                ud = ud.isoformat()
            except Exception:
                ud = str(ud)
        recent_scans.append({
            "id": s["id"],
            "imageId": s["id"],
            "patientId": s["patient_id"],
            "patientName": s["patientName"],
            "imagePath": s.get("image_path", ""),
            "uploadDate": ud,
            "status": s.get("status", "analyzed"),
        })

    # ── 7. Server timestamp ───────────────────────────────────
    return {
        "totalPatients": total_patients,
        "totalScans": total_scans,
        "scansToday": scans_today,
        "criticalCases": critical_cases,
        "drDistribution": dist_list,
        "recentScans": recent_scans,
        "monthlyScans": monthly_scans,
        "serverTime": now_utc.isoformat(),
    }
