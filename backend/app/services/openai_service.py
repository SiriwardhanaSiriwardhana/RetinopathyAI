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
