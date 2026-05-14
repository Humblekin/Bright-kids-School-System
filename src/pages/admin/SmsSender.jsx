import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FiMessageSquare, FiSend, FiCheck } from 'react-icons/fi';
import Layout from '../../components/Layout';

export default function SmsSender() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [targetClass, setTargetClass] = useState('all');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [cSnap, stSnap] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'students'))
        ]);
        setClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStudents(stSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setSending(true);
    // Simulate API call to SMS Provider (e.g. Twilio, Hubtel, etc.)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSending(false);
    setSent(true);
    setMessage('');
    setTimeout(() => setSent(false), 3000);
  };

  const getRecipientCount = () => {
    if (targetClass === 'all') return students.filter(s => s.parentContact).length;
    return students.filter(s => s.classId === targetClass && s.parentContact).length;
  };

  if (loading) return <Layout><div className="loading-spinner"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="content-card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="content-card-header">
          <h3><FiMessageSquare style={{ marginRight: 8 }} /> Send SMS to Parents</h3>
        </div>
        <div className="content-card-body">
          <form onSubmit={handleSend}>
            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select className="form-select" value={targetClass} onChange={e => setTargetClass(e.target.value)}>
                <option value="all">All Parents</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} Parents</option>)}
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                This message will be sent to <strong>{getRecipientCount()}</strong> valid contacts.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea 
                className="form-input" 
                rows="5" 
                placeholder="Type your message here..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              ></textarea>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
                {message.length} characters ({(Math.ceil(message.length / 160) || 1)} SMS)
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={sending || getRecipientCount() === 0}>
              {sending ? 'Sending SMS...' : <><FiSend /> Send Message</>}
            </button>
          </form>
        </div>
      </div>
      {sent && <div className="toast toast-success"><FiCheck /> SMS dispatched successfully!</div>}
    </Layout>
  );
}
