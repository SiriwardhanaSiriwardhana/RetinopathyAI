import re

# 1. Update reports.py to use scan_id
with open('app/api/routes/reports.py', 'r', encoding='utf-8') as f:
    reports_code = f.read()

reports_code = reports_code.replace('@router.get("/{report_id}/pdf")', '@router.get("/{scan_id}/pdf")')
reports_code = reports_code.replace('async def generate_pdf_report(\n    report_id: str,', 'async def generate_pdf_report(\n    scan_id: str,')
reports_code = reports_code.replace(
    '''    # Fetch diagnosis
    diag_doc = db.collection("diagnoses").document(report_id).get()
    if not diag_doc.exists:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    diag_data = diag_doc.to_dict()''',
    '''    # Fetch diagnosis
    docs = list(db.collection("diagnoses").where("scan_id", "==", scan_id).limit(1).stream())
    if not docs:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    diag_doc = docs[0]
    diag_data = diag_doc.to_dict()
    report_id = diag_doc.id'''
)
reports_code = reports_code.replace(
    '''    # Fetch scan
    scan_id = diag_data.get("scan_id")''',
    '''    # Fetch scan'''
)

with open('app/api/routes/reports.py', 'w', encoding='utf-8') as f:
    f.write(reports_code)

# 2. Update scans.py to add get_diagnosis_by_scan
with open('app/api/routes/scans.py', 'r', encoding='utf-8') as f:
    scans_code = f.read()

new_route = '''
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
'''
if 'get_diagnosis_by_scan' not in scans_code:
    scans_code += new_route
    with open('app/api/routes/scans.py', 'w', encoding='utf-8') as f:
        f.write(scans_code)
