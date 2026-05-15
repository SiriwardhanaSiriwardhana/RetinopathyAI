import re

with open('frontend/src/pages/PatientDetailPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const mockPatient: Patient = \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const mockScans: RetinalScan\[\] = \[.*?\];\n\n', '', content, flags=re.DOTALL)
content = re.sub(r'const mockDiagnoses: Diagnosis\[\] = \[.*?\];\n\n', '', content, flags=re.DOTALL)

replace_target = '''export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scans' | 'diagnoses'>('scans');

  // Replace with API call: patientsAPI.getById(Number(id))
  const patient = mockPatient;
  const scans = mockScans;
  const diagnoses = mockDiagnoses;'''

replacement = '''export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scans' | 'diagnoses'>('scans');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [scans, setScans] = useState<RetinalScan[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  useEffect(() => {
    if (id) {
      patientsAPI.getById(id).then(setPatient).catch(console.error);
    }
  }, [id]);

  if (!patient) return <div className="patient-detail">Loading...</div>;'''

content = content.replace(replace_target, replacement)
content = content.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';")

with open('frontend/src/pages/PatientDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
