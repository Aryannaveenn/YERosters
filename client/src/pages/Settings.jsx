import { useState, useEffect } from 'react';
import { useAuth, API } from '../context/AuthContext';

export default function Settings() {
  const { token } = useAuth();
  const [phone, setPhone] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [savedPhone, setSavedPhone] = useState(false);
  const [savedHours, setSavedHours] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers })
      .then(r => r.json())
      .then(data => setPhone(data.phone || ''));
    fetch(`${API}/settings/operating-hours`, { headers })
      .then(r => r.json())
      .then(data => { setStartTime(data.startTime); setEndTime(data.endTime); });
  }, []);

  async function handleSavePhone(e) {
    e.preventDefault();
    setError('');
    setSavedPhone(false);
    const res = await fetch(`${API}/auth/phone`, {
      method: 'PUT', headers,
      body: JSON.stringify({ phone }),
    });
    if (res.ok) setSavedPhone(true);
    else setError((await res.json()).error);
  }

  async function handleSaveHours(e) {
    e.preventDefault();
    setSavedHours(false);
    await fetch(`${API}/settings/operating-hours`, {
      method: 'PUT', headers,
      body: JSON.stringify({ startTime, endTime }),
    });
    setSavedHours(true);
  }

  return (
    <div className="page">
      <h2>Settings</h2>

      <form onSubmit={handleSavePhone} className="settings-form">
        <label htmlFor="phone">SMS Notification Number</label>
        <p className="settings-hint">You'll receive a text when an employee submits an availability request.</p>
        <input
          id="phone"
          type="tel"
          placeholder="+1234567890"
          value={phone}
          onChange={e => { setPhone(e.target.value); setSavedPhone(false); }}
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn">Save</button>
        {savedPhone && <span className="success-msg">Phone number saved!</span>}
      </form>

      <form onSubmit={handleSaveHours} className="settings-form" style={{ marginTop: '1.5rem' }}>
        <label>Operating Hours</label>
        <p className="settings-hint">Shifts on the roster will be set within these hours.</p>
        <div className="operating-hours-inputs">
          <input type="time" value={startTime} onChange={e => { setStartTime(e.target.value); setSavedHours(false); }} />
          <span>to</span>
          <input type="time" value={endTime} onChange={e => { setEndTime(e.target.value); setSavedHours(false); }} />
        </div>
        <button type="submit" className="btn">Save</button>
        {savedHours && <span className="success-msg">Operating hours saved!</span>}
      </form>
    </div>
  );
}
