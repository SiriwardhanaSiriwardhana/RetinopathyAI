import os
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from google.cloud import firestore
import jinja2
import io
from starlette.concurrency import run_in_threadpool

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/reports", tags=["Reports"])

# Setup Jinja2
template_dir = Path(__file__).parent.parent.parent / "templates"
env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir))

def get_severity_colors(stage: str):
    colors = {
        'No DR': {'bg': '#ecfdf5', 'text': '#10b981'},
        'Mild NPDR': {'bg': '#eff6ff', 'text': '#3b82f6'},
        'Mild': {'bg': '#eff6ff', 'text': '#3b82f6'},
        'Moderate NPDR': {'bg': '#fffbeb', 'text': '#f59e0b'},
        'Moderate': {'bg': '#fffbeb', 'text': '#f59e0b'},
        'Severe NPDR': {'bg': '#fef2f2', 'text': '#ef4444'},
        'Severe': {'bg': '#fef2f2', 'text': '#ef4444'},
        'Proliferative DR': {'bg': '#f5f3ff', 'text': '#7c3aed'},
    }
    return colors.get(stage, {'bg': '#f3f4f6', 'text': '#6b7280'})

def run_pdf_generator(html_content: str) -> bytes:
    """Helper to run the Node.js Puppeteer script."""
    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as html_file:
        html_file.write(html_content)
        html_path = html_file.name

    pdf_path = html_path.replace(".html", ".pdf")
    generator_js = Path(__file__).parent.parent.parent / "utils" / "pdf_generator.js"

    try:
        # Run the Node.js script synchronously
        result = subprocess.run(
            ["node", str(generator_js), html_path, pdf_path],
            capture_output=True,
            text=True,
            check=True
        )
        
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        
        return pdf_bytes
    except subprocess.CalledProcessError as e:
        print(f"Node.js Error: {e.stderr}")
        raise RuntimeError(f"PDF generation failed: {e.stderr}")
    finally:
        # Cleanup
        if os.path.exists(html_path):
            os.remove(html_path)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

@router.get("/{scan_id}/pdf")
async def generate_pdf_report(
    scan_id: str,
    request: Request,
    db: firestore.Client = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    # Fetch diagnosis
    docs = list(db.collection("diagnoses").where("scan_id", "==", scan_id).limit(1).stream())
    if not docs:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    diag_doc = docs[0]
    diag_data = diag_doc.to_dict()
    report_id = diag_doc.id

    # Fetch patient
    patient_id = diag_data.get("patient_id")
    patient_doc = db.collection("patients").document(patient_id).get()
    patient_data = patient_doc.to_dict() if patient_doc.exists else {}

    # Fetch scan
    scan_doc = db.collection("scans").document(scan_id).get()
    scan_data = scan_doc.to_dict() if scan_doc.exists else {}

    # Image URL
    image_path = scan_data.get("image_path", "")
    filename = Path(image_path).name
    base_url = str(request.base_url).rstrip("/")
    image_url = f"{base_url}/uploads/{filename}"

    colors = get_severity_colors(diag_data.get("dr_stage", ""))
    created_at = diag_data.get("created_at")
    if hasattr(created_at, "timestamp"):
        date_str = datetime.fromtimestamp(created_at.timestamp()).strftime("%B %d, %Y")
    else:
        date_str = str(created_at)

    template = env.get_template("report_template.html")
    html_content = template.render(
        report_id=report_id,
        date=date_str,
        patient_name=patient_data.get("name", "Unknown"),
        patient_id=patient_id[:8],
        patient_age=patient_data.get("age", "N/A"),
        diabetes_type=patient_data.get("diabetes_type", "N/A"),
        dr_stage=diag_data.get("dr_stage", "Unknown"),
        confidence_percent=round(diag_data.get("confidence", 0) * 100, 1),
        severity_bg=colors["bg"],
        severity_color=colors["text"],
        details=diag_data.get("details", "No details available."),
        image_url=image_url
    )

    try:
        # Run the heavy PDF generation in a threadpool to avoid blocking
        pdf_bytes = await run_in_threadpool(run_pdf_generator, html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Diagnostic_Report_{report_id}.pdf"}
    )
