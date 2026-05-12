"""
OpenAI GPT-4o integration for clinical recommendations.
"""

from app.core.config import settings


def get_clinical_recommendation(dr_stage: str, confidence: float, details: str) -> str:
    """
    Call OpenAI GPT-4o to generate a clinical recommendation for a given DR diagnosis.
    Returns a recommendation string, or a fallback if OpenAI is unavailable.
    """
    if not settings.OPENAI_API_KEY:
        return _fallback_recommendation(dr_stage)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""You are an expert ophthalmologist specializing in diabetic retinopathy.
A patient's retinal fundus image was analyzed by an AI model with the following result:

- Diagnosis: {dr_stage}
- Confidence: {round(confidence * 100, 1)}%
- AI Findings: {details}

Provide a concise, professional clinical recommendation (3-5 sentences) that a doctor can use 
to guide the patient's next steps. Include urgency level, recommended follow-up timeframe, 
any referrals needed, and lifestyle advice. Do not repeat the diagnosis; focus on actionable guidance.
Write in clear medical English suitable for a clinical report."""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a clinical ophthalmology assistant providing medical guidance based on AI-assisted retinal analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"[OpenAI] Error generating recommendation: {e}")
        return _fallback_recommendation(dr_stage)


def _fallback_recommendation(dr_stage: str) -> str:
    """Fallback recommendations when OpenAI is unavailable."""
    recommendations = {
        "No DR": "No diabetic retinopathy detected. Continue annual screening and maintain good glycemic control. Regular HbA1c monitoring and blood pressure management are advised.",
        "Mild NPDR": "Mild non-proliferative diabetic retinopathy detected. Schedule a follow-up ophthalmic examination in 6–12 months. Optimize blood glucose and blood pressure control.",
        "Moderate NPDR": "Moderate non-proliferative diabetic retinopathy detected. Referral to a retinal specialist is recommended within 3–6 months. Tighten glycemic control and monitor for progression.",
        "Severe NPDR": "Severe non-proliferative diabetic retinopathy detected. Urgent referral to a retinal specialist is required within 1–2 months. Consider pan-retinal photocoagulation therapy evaluation.",
        "Proliferative DR": "Proliferative diabetic retinopathy detected — urgent ophthalmic intervention required. Immediate referral to a retinal specialist is necessary. Pan-retinal photocoagulation or anti-VEGF therapy may be indicated.",
    }
    return recommendations.get(dr_stage, "Please consult a qualified ophthalmologist for a comprehensive evaluation and personalized treatment plan.")


def get_prescription_suggestion(
    dr_stage: str,
    confidence: float,
    details: str,
    patient_age: int = None,
    diabetes_type: str = None,
) -> dict:
    """
    Call OpenAI GPT-4o to generate a suggested prescription for a given DR diagnosis.
    Returns a dict with 'doctor_notes' and 'medicines' list, or a sensible fallback.
    """
    age_info = f"Patient Age: {patient_age}" if patient_age else ""
    diabetes_info = f"Diabetes Type: {diabetes_type}" if diabetes_type else ""

    if not settings.OPENAI_API_KEY:
        return _fallback_prescription(dr_stage)

    try:
        from openai import OpenAI
        import json as _json
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""You are an expert ophthalmologist and diabetologist creating a clinical prescription.

Patient Diagnosis:
- DR Stage: {dr_stage}
- AI Confidence: {round(confidence * 100, 1)}%
- AI Findings: {details}
{age_info}
{diabetes_info}

Generate a medically appropriate prescription suggestion in strict JSON format. Include:
1. "doctor_notes": A concise paragraph (2-3 sentences) with the clinical summary and key treatment notes for the doctor to review.
2. "medicines": An array of medicine objects, each with exactly these fields:
   - "name": medicine name
   - "dosage": specific dosage (e.g., "500mg", "0.5mg/mL eye drops")
   - "frequency": how often (e.g., "Twice daily", "Once at bedtime", "Every 8 hours")
   - "duration": treatment duration (e.g., "30 days", "3 months", "Ongoing")
   - "notes": special instructions (e.g., "Take with food", "Apply 1 drop to affected eye")

Include 2-5 medicines appropriate for the DR stage. Focus on:
- Glycemic control medications if relevant
- Ophthalmic medications if needed
- Anti-VEGF or related treatments for severe stages
- Vitamins/supplements beneficial for eye health

Respond ONLY with valid JSON. No markdown, no explanation."""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a clinical prescription assistant. Always respond with valid JSON only."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=0.3,
        )

        raw = response.choices[0].message.content.strip()
        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = _json.loads(raw)

        # Validate structure
        medicines = parsed.get("medicines", [])
        validated_meds = []
        for m in medicines:
            validated_meds.append({
                "name": str(m.get("name", "")),
                "dosage": str(m.get("dosage", "")),
                "frequency": str(m.get("frequency", "")),
                "duration": str(m.get("duration", "")),
                "notes": str(m.get("notes", "")),
            })

        return {
            "doctor_notes": str(parsed.get("doctor_notes", "")),
            "medicines": validated_meds,
        }

    except Exception as e:
        print(f"[OpenAI] Error generating prescription suggestion: {e}")
        return _fallback_prescription(dr_stage)


def _fallback_prescription(dr_stage: str) -> dict:
    """Fallback prescription suggestions when OpenAI is unavailable."""
    base_meds = [
        {
            "name": "Metformin",
            "dosage": "500mg",
            "frequency": "Twice daily",
            "duration": "Ongoing",
            "notes": "Take with meals. Monitor blood glucose regularly.",
        },
        {
            "name": "Lutein & Zeaxanthin (Eye Supplement)",
            "dosage": "10mg / 2mg",
            "frequency": "Once daily",
            "duration": "3 months",
            "notes": "Take with a fat-containing meal for better absorption.",
        },
    ]

    stage_notes = {
        "No DR": "No active retinopathy detected. Continue glycemic control and annual eye screening. Lifestyle modifications recommended.",
        "Mild": "Mild NPDR detected. Optimize blood glucose and blood pressure. Schedule follow-up in 6-12 months.",
        "Moderate": "Moderate NPDR detected. Glycemic optimization is essential. Ophthalmology referral recommended within 3-6 months.",
        "Severe": "Severe NPDR detected. Urgent referral to retinal specialist required. Consider pan-retinal photocoagulation evaluation.",
        "Proliferative DR": "Proliferative DR detected. Immediate retinal specialist referral required. Anti-VEGF therapy or laser photocoagulation may be needed.",
    }

    if dr_stage in ("Severe", "Proliferative DR"):
        base_meds.append({
            "name": "Ranibizumab (Lucentis) — if indicated",
            "dosage": "0.5mg intravitreal",
            "frequency": "Monthly (as advised by specialist)",
            "duration": "As per specialist protocol",
            "notes": "Administer only by qualified ophthalmologist. Anti-VEGF therapy.",
        })

    return {
        "doctor_notes": stage_notes.get(dr_stage, "Please review the AI findings and prescribe accordingly."),
        "medicines": base_meds,
    }

