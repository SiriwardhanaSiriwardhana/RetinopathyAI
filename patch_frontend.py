import re

# 1. Update frontend/src/api/index.ts
with open('frontend/src/api/index.ts', 'r', encoding='utf-8') as f:
    api_code = f.read()

new_method = '''
  getDiagnosisByScanId: async (scanId: string) => {
    const { data } = await api.get<any>(`/diagnosis/scan/${scanId}`);
    return data;
  },
'''
if 'getDiagnosisByScanId' not in api_code:
    api_code = api_code.replace(
        'getDiagnosis: async (reportId: string) => {\n    const { data } = await api.get<Diagnosis>(`/diagnosis/${reportId}`);\n    return data;\n  },',
        'getDiagnosis: async (reportId: string) => {\n    const { data } = await api.get<Diagnosis>(`/diagnosis/${reportId}`);\n    return data;\n  },' + new_method
    )
    with open('frontend/src/api/index.ts', 'w', encoding='utf-8') as f:
        f.write(api_code)

# 2. Update frontend/src/pages/DiagnosisReportPage.tsx
with open('frontend/src/pages/DiagnosisReportPage.tsx', 'r', encoding='utf-8') as f:
    diag_code = f.read()

# Replace imports
diag_code = diag_code.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';\nimport { predictionAPI, scansAPI } from '../api';")

# Replace component state initialization
replace_target = '''  const [diagnosis] = useState<Diagnosis>(() => {
    if (prediction) {
      // Map backend stage string back to frontend type if needed
      let stage = prediction.dr_stage;
      if (stage.includes('Mild')) stage = 'Mild';
      else if (stage.includes('Moderate')) stage = 'Moderate';
      else if (stage.includes('Severe')) stage = 'Severe';
      else if (stage.includes('Proliferative')) stage = 'Proliferative DR';
      else stage = 'No DR';

      return {
        ...mockDiagnosis,
        drStage: stage as any,
        confidence: prediction.confidence,
        imageId: scan?.id || 1,
        createdDate: new Date().toISOString().split('T')[0],
      };
    }
    return mockDiagnosis;
  });'''

replacement = '''  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [actualScan, setActualScan] = useState<any>(scan);

  useEffect(() => {
    if (id) {
      predictionAPI.getDiagnosisByScanId(id)
        .then((data) => {
          let stage = data.dr_stage || '';
          if (stage.includes('Mild')) stage = 'Mild';
          else if (stage.includes('Moderate')) stage = 'Moderate';
          else if (stage.includes('Severe')) stage = 'Severe';
          else if (stage.includes('Proliferative')) stage = 'Proliferative DR';
          else stage = 'No DR';

          setDiagnosis({
            reportId: data.id,
            imageId: id,
            patientId: data.patient_id || 1,
            patientName: 'Patient',
            drStage: stage,
            confidence: data.confidence,
            findings: data.details ? data.details.split('\\n') : [],
            recommendations: 'Follow up according to clinical guidelines.',
            createdDate: data.created_at || new Date().toISOString().split('T')[0]
          });
        })
        .catch(console.error);
        
      if (!actualScan) {
        scansAPI.getById(id).then(setActualScan).catch(console.error);
      }
    }
  }, [id, actualScan]);

  if (!diagnosis) return <div className="diagnosis-report">Loading report...</div>;'''

diag_code = diag_code.replace(replace_target, replacement)
diag_code = diag_code.replace('scan?.imagePath', 'actualScan?.imagePath')
diag_code = diag_code.replace('scan.imagePath', 'actualScan.imagePath')

with open('frontend/src/pages/DiagnosisReportPage.tsx', 'w', encoding='utf-8') as f:
    f.write(diag_code)
