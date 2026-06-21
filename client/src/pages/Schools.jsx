import { useState, useEffect } from 'react';
import { useAuth, API } from '../context/AuthContext';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri' };

export default function Schools() {
  const { token } = useAuth();
  const [schools, setSchools] = useState([]);
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function loadSchools() {
    const res = await fetch(`${API}/schools`, { headers });
    setSchools(await res.json());
  }

  useEffect(() => { loadSchools(); }, []);

  function toggleDay(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (selectedDays.length === 0) { setError('Select at least one day'); return; }

    const body = JSON.stringify({ name, days: selectedDays });

    if (editingId) {
      await fetch(`${API}/schools/${editingId}`, { method: 'PUT', headers, body });
    } else {
      const res = await fetch(`${API}/schools`, { method: 'POST', headers, body });
      if (!res.ok) { setError((await res.json()).error); return; }
    }

    setName('');
    setSelectedDays([]);
    setEditingId(null);
    loadSchools();
  }

  function startEdit(school) {
    setEditingId(school._id);
    setName(school.name);
    setSelectedDays(school.days);
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setSelectedDays([]);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this school?')) return;
    await fetch(`${API}/schools/${id}`, { method: 'DELETE', headers });
    loadSchools();
  }

  return (
    <div className="page">
      <h2>Manage Schools</h2>
      <form onSubmit={handleSubmit} className="create-form">
        {error && <div className="error">{error}</div>}
        <input placeholder="School name" value={name} onChange={e => setName(e.target.value)} required />
        <div className="day-toggles">
          {DAYS.map(day => (
            <button type="button" key={day} className={`day-toggle ${selectedDays.includes(day) ? 'active' : ''}`} onClick={() => toggleDay(day)}>
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
        <button type="submit" className="btn">{editingId ? 'Update' : 'Add School'}</button>
        {editingId && <button type="button" className="btn btn-sm" onClick={cancelEdit}>Cancel</button>}
      </form>

      <table className="data-table">
        <thead>
          <tr><th>School</th><th>Days</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {schools.map(s => (
            <tr key={s._id}>
              <td>{s.name}</td>
              <td>{s.days.map(d => DAY_LABELS[d]).join(', ')}</td>
              <td>
                <button onClick={() => startEdit(s)} className="btn btn-sm" style={{ marginRight: '0.5rem' }}>Edit</button>
                <button onClick={() => handleDelete(s._id)} className="btn btn-danger btn-sm">Delete</button>
              </td>
            </tr>
          ))}
          {schools.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', color: '#999' }}>No schools added yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
