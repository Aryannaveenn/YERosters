import { useState, useEffect } from 'react';
import { useAuth, API } from '../context/AuthContext';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday' };

function toLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function snapToMonday(date) {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDate(d);
}

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 1 ? (1 - day) : (8 - day);
  d.setDate(d.getDate() + diff);
  return toLocalDate(d);
}

const defaultDays = () => Object.fromEntries(DAYS.map(d => [d, { available: true, startTime: '09:00', endTime: '17:00' }]));

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', denied: 'Denied' };

export default function AvailabilityPage() {
  const { token } = useAuth();
  const [weekStarting, setWeekStarting] = useState(getNextMonday());
  const [days, setDays] = useState(defaultDays());
  const [submitted, setSubmitted] = useState(false);
  const [requests, setRequests] = useState([]);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/availability/me?weekStarting=${weekStarting}`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) setDays(data[0].days);
        else setDays(defaultDays());
      });
    setSubmitted(false);
  }, [weekStarting]);

  useEffect(() => {
    fetch(`${API}/availability/requests/me`, { headers })
      .then(r => r.json())
      .then(setRequests);
  }, [submitted]);

  function updateDay(day, field, value) {
    setDays(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    setSubmitted(false);
  }

  async function handleSubmit() {
    await fetch(`${API}/availability`, {
      method: 'PUT', headers,
      body: JSON.stringify({ weekStarting, days }),
    });
    setSubmitted(true);
  }

  function formatWeek(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="page">
      <h2>My Availability</h2>
      <div className="week-picker">
        <label>Week starting:</label>
        <input type="date" value={weekStarting} onChange={e => setWeekStarting(snapToMonday(e.target.value))} />
      </div>
      <div className="availability-grid">
        {DAYS.map(day => (
          <div key={day} className={`day-card ${!days[day]?.available ? 'unavailable' : ''}`}>
            <div className="day-header">
              <label>
                <input type="checkbox" checked={days[day]?.available ?? true} onChange={e => updateDay(day, 'available', e.target.checked)} />
                {DAY_LABELS[day]}
              </label>
            </div>
            {days[day]?.available && (
              <div className="time-inputs">
                <input type="time" value={days[day]?.startTime || '09:00'} onChange={e => updateDay(day, 'startTime', e.target.value)} />
                <span>to</span>
                <input type="time" value={days[day]?.endTime || '17:00'} onChange={e => updateDay(day, 'endTime', e.target.value)} />
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={handleSubmit} className="btn" style={{ marginTop: '1rem' }}>
        Submit Request
      </button>
      {submitted && <span className="success-msg">Request submitted! Waiting for admin approval.</span>}

      {requests.length > 0 && (
        <div className="my-requests">
          <h3>My Requests</h3>
          {requests.map(r => (
            <div key={r._id} className="request-card">
              <div className="request-header">
                <span>Week of {formatWeek(r.weekStarting)}</span>
                <span className={`request-status ${r.status}`}>{STATUS_LABELS[r.status]}</span>
              </div>
              <div className="avail-days">
                {DAYS.map(day => {
                  const d = r.days?.[day];
                  return (
                    <div key={day} className={`avail-day ${d?.available ? 'available' : 'unavailable'}`}>
                      <span className="avail-day-name">{DAY_LABELS[day].slice(0, 3)}</span>
                      {d?.available ? (
                        <span className="avail-day-time">{d.startTime} - {d.endTime}</span>
                      ) : (
                        <span className="avail-day-time">Off</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
