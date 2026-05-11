import re

with open('frontend/src/pages/PatientsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove mockPatients array
content = re.sub(r'const mockPatients: Patient\[\] = \[.*?\];\n\n', '', content, flags=re.DOTALL)

# Replace the component logic
replace_target = '''export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    age: 0,
    gender: 'Male',
    diabetesType: 'Type 2',
    phone: '',
    email: '',
  });
  const navigate = useNavigate();

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newPatient: Patient = {
      ...formData,
      id: patients.length + 1,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPatients([newPatient, ...patients]);
    setShowModal(false);
    setFormData({ name: '', age: 0, gender: 'Male', diabetesType: 'Type 2', phone: '', email: '' });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to remove this patient?')) {
      setPatients(patients.filter((p) => p.id !== id));
    }
  };'''

replacement = '''import { patientsAPI } from '../api';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    age: 0,
    gender: 'Male',
    diabetesType: 'Type 2',
    phone: '',
    email: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    patientsAPI.getAll().then(setPatients).catch(console.error);
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newPatient = await patientsAPI.create(formData);
      setPatients([newPatient, ...patients]);
      setShowModal(false);
      setFormData({ name: '', age: 0, gender: 'Male', diabetesType: 'Type 2', phone: '', email: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this patient?')) {
      try {
        await patientsAPI.delete(id);
        setPatients(patients.filter((p) => p.id !== id));
      } catch (error) {
        console.error(error);
      }
    }
  };'''

content = content.replace(replace_target, replacement)
content = content.replace('const handleDelete = (id: number)', 'const handleDelete = (id: string)')
content = content.replace('onClick={() => handleDelete(patient.id)}', 'onClick={() => handleDelete(patient.id as string)}')

with open('frontend/src/pages/PatientsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
