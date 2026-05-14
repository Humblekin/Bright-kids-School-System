import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FiSave, FiUpload, FiCheck, FiImage, FiX } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function SchoolSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ schoolName: 'BRIGHT KIDS SCHOOL COMPLEX', academicYear: '2025/2026' });
  const [badgeUrl, setBadgeUrl] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const snap = await getDoc(doc(db, 'settings', 'school'));
      if (snap.exists()) {
        const data = snap.data();
        setForm({ schoolName: data.schoolName || 'BRIGHT KIDS SCHOOL COMPLEX', academicYear: data.academicYear || '2025/2026' });
        setBadgeUrl(data.badgeUrl || '');
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const handleBadgeSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setBadgeUrl(event.target.result);
      setReading(false);
      setToast({ type: 'success', message: 'Badge selected. Save settings to confirm.' });
    };
    reader.onerror = () => {
      setToast({ type: 'error', message: 'Failed to read image file.' });
      setReading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'school'), {
        schoolName: form.schoolName,
        academicYear: form.academicYear,
        badgeUrl,
      });
      setToast({ type: 'success', message: 'Settings saved successfully' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message });
    }
    setSaving(false);
  };

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="content-card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="content-card-header">
          <h3><FiImage style={{ marginRight: 8 }} /> School Settings</h3>
        </div>
        <div className="content-card-body">
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">School Badge</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
                {badgeUrl ? (
                  <img src={badgeUrl} alt="School Badge" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: '#fff' }} />
                ) : (
                  <div style={{ width: 100, height: 100, borderRadius: 'var(--radius)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
                    <FiImage size={32} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                <div>
                  <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <FiUpload /> {badgeUrl ? 'Change Badge' : 'Select Badge'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBadgeSelect} disabled={reading} />
                  </label>
                  {reading && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>Reading file...</div>}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">School Name</label>
              <input className="form-input" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <input className="form-input" value={form.academicYear} onChange={e => setForm({...form, academicYear: e.target.value})} placeholder="e.g. 2025/2026" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={saving}>
              {saving ? 'Saving...' : <><FiSave /> Save Settings</>}
            </button>
          </form>
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <FiCheck /> : <FiX />}
          {toast.message}
        </div>
      )}
    </Layout>
  );
}
