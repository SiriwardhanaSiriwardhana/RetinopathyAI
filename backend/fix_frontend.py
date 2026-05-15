import re

# Dashboard.tsx
with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'const mockStats: DashboardStats = \{.*?\};\n\n', '', content, flags=re.DOTALL)
content = content.replace(
    'export default function Dashboard() {\n  const [stats] = useState<DashboardStats>(mockStats);\n  const navigate = useNavigate();',
    '''export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardAPI.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return <div className="dashboard-page">Loading dashboard...</div>;
  }'''
)
with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ScanHistoryPage.tsx
with open('frontend/src/pages/ScanHistoryPage.tsx', 'r', encoding='utf-8') as f:
    content2 = f.read()
content2 = re.sub(r'const mockScans: RetinalScan\[\] = \[.*?\];\n\n', '', content2, flags=re.DOTALL)
content2 = content2.replace(
    "import { useState } from 'react';",
    "import { useState, useEffect } from 'react';\nimport { scansAPI } from '../api';"
)
content2 = content2.replace(
    'export default function ScanHistoryPage() {\n  const [scans] = useState<RetinalScan[]>(mockScans);',
    '''export default function ScanHistoryPage() {
  const [scans, setScans] = useState<RetinalScan[]>([]);
  useEffect(() => {
    scansAPI.getAll().then(setScans).catch(console.error);
  }, []);'''
)
with open('frontend/src/pages/ScanHistoryPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content2)

# PatientDetailPage.tsx
with open('frontend/src/pages/PatientDetailPage.tsx', 'r', encoding='utf-8') as f:
    content3 = f.read()
content3 = re.sub(r'const mockPatient = \{.*?};\n\n', '', content3, flags=re.DOTALL)
content3 = content3.replace(
    "import { useState } from 'react';",
    "import { useState, useEffect } from 'react';\nimport { patientsAPI } from '../api';"
)
content3 = content3.replace(
    'export default function PatientDetailPage() {\n  const { id } = useParams();\n  const navigate = useNavigate();\n  const [patient] = useState(mockPatient);',
    '''export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  
  useEffect(() => {
    if (id) {
      patientsAPI.getById(id).then(data => {
        setPatient({ ...data, history: [], scanHistory: [] });
      }).catch(console.error);
    }
  }, [id]);
  
  if (!patient) return <div>Loading...</div>;'''
)
with open('frontend/src/pages/PatientDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content3)

