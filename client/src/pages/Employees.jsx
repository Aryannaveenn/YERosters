import { useState, useEffect } from 'react';
import { useAuth, API } from '../context/AuthContext';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday' };

export default function Employees() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [allPendingCount, setAllPendingCount] = useState(0);
  const [schools, setSchools] = useState([]);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function loadUsers() {
    const res = await fetch(`${API}/users`, { headers });
    setUsers(await res.json());
  }

  async function loadAllPendingCount() {
    const res = await fetch(`${API}/availability/requests`, { headers });
    const data = await res.json();
    setAllPendingCount(data.length);
  }

  useEffect(() => {
    loadUsers();
    loadAllPendingCount();
    fetch(`${API}/schools`, { headers }).then(r => r.json()).then(setSchools);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API}/users`, { method: 'POST', headers, body: JSON.stringify({ ...form, role: 'employee' }) });
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm({ name: '', email: '', password: '', phone: '' });
    loadUsers();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this employee?')) return;
    await fetch(`${API}/users/${id}`, { method: 'DELETE', headers });
    if (expandedId === id) setExpandedId(null);
    loadUsers();
  }

  async function loadEmployeeData(userId) {
    setLoadingAvail(true);
    const [availRes, reqRes] = await Promise.all([
      fetch(`${API}/availability/user/${userId}`, { headers }),
      fetch(`${API}/availability/requests/user/${userId}`, { headers }),
    ]);
    setAvailabilities(await availRes.json());
    setPendingRequests(await reqRes.json());
    setLoadingAvail(false);
  }

  async function toggleExpand(userId) {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(userId);
    await loadEmployeeData(userId);
  }

  async function handleDeleteAvail(availId, userId) {
    if (!confirm('Delete this week of availability?')) return;
    await fetch(`${API}/availability/${availId}`, { method: 'DELETE', headers });
    await loadEmployeeData(userId);
  }

  async function handleApprove(requestId, userId) {
    await fetch(`${API}/availability/requests/${requestId}/approve`, { method: 'POST', headers });
    await loadEmployeeData(userId);
    loadAllPendingCount();
  }

  async function handleDeny(requestId, userId) {
    await fetch(`${API}/availability/requests/${requestId}/deny`, { method: 'POST', headers });
    await loadEmployeeData(userId);
    loadAllPendingCount();
  }

  function formatWeek(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function handleSetDefaultSchool(userId, schoolId) {
    await fetch(`${API}/users/${userId}/default-school`, {
      method: 'PUT', headers,
      body: JSON.stringify({ defaultSchool: schoolId || null }),
    });
    loadUsers();
  }

  const pending = pendingRequests.filter(r => r.status === 'pending');
  const resolved = pendingRequests.filter(r => r.status !== 'pending');

  return (
    <div className="page">
      <h2>Manage Employees {allPendingCount > 0 && <span className="pending-badge">{allPendingCount} pending</span>}</h2>
      <form onSubmit={handleCreate} className="create-form">
        {error && <div className="error">{error}</div>}
        <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <button type="submit" className="btn">Add Employee</button>
      </form>
      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Default School</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <>
              <tr key={u._id} className={`clickable-row ${expandedId === u._id ? 'expanded' : ''}`} onClick={() => u.role !== 'admin' && toggleExpand(u._id)}>
                <td>{u.name} {u.role !== 'admin' && <span className="expand-arrow">{expandedId === u._id ? '▾' : '▸'}</span>}</td>
                <td>{u.email}</td>
                <td>{u.role === 'admin' ? '—' : (u.defaultSchool?.name || '—')}</td>
                <td>{u.role !== 'admin' && <button onClick={(e) => { e.stopPropagation(); handleDelete(u._id); }} className="btn btn-danger btn-sm">Delete</button>}</td>
              </tr>
              {expandedId === u._id && (
                <tr key={`${u._id}-avail`} className="avail-row">
                  <td colSpan="4">
                    {loadingAvail ? (
                      <div className="avail-loading">Loading...</div>
                    ) : (
                      <>
                        <div className="default-school-row">
                          <label>Default School:</label>
                          <select
                            value={u.defaultSchool?._id || ''}
                            onChange={e => handleSetDefaultSchool(u._id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                          >
                            <option value="">None</option>
                            {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                          </select>
                          {u.defaultSchool && <span className="default-school-label">{u.defaultSchool.name}</span>}
                        </div>

                        {pending.length > 0 && (
                          <div className="requests-section">
                            <h4>Pending Requests</h4>
                            {pending.map(r => (
                              <div key={r._id} className="request-card pending">
                                <div className="request-card-header">
                                  <span>Week of {formatWeek(r.weekStarting)}</span>
                                  <span className="request-date">Submitted {formatDate(r.createdAt)}</span>
                                  <div className="request-actions">
                                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(r._id, u._id)}>Approve</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDeny(r._id, u._id)}>Deny</button>
                                  </div>
                                </div>
                                <div className="avail-days">
                                  {DAYS.map(day => {
                                    const d = r.days?.[day];
                                    return (
                                      <div key={day} className={`avail-day ${d?.available ? 'available' : 'unavailable'}`}>
                                        <span className="avail-day-name">{DAY_LABELS[day]}</span>
                                        {d?.available ? (
                                          <span className="avail-day-time">{d.startTime} - {d.endTime}</span>
                                        ) : (
                                          <span className="avail-day-time">Unavailable</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {resolved.length > 0 && (
                          <div className="requests-section">
                            <h4>Past Requests</h4>
                            {resolved.map(r => (
                              <div key={r._id} className={`request-card ${r.status}`}>
                                <div className="request-card-header">
                                  <span>Week of {formatWeek(r.weekStarting)}</span>
                                  <span className={`request-status ${r.status}`}>{r.status === 'approved' ? 'Approved' : 'Denied'}</span>
                                </div>
                                <div className="avail-days">
                                  {DAYS.map(day => {
                                    const d = r.days?.[day];
                                    return (
                                      <div key={day} className={`avail-day ${d?.available ? 'available' : 'unavailable'}`}>
                                        <span className="avail-day-name">{DAY_LABELS[day]}</span>
                                        {d?.available ? (
                                          <span className="avail-day-time">{d.startTime} - {d.endTime}</span>
                                        ) : (
                                          <span className="avail-day-time">Unavailable</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="requests-section">
                          <h4>Current Availabilities</h4>
                          {availabilities.length === 0 ? (
                            <div className="avail-empty">No availability set yet.</div>
                          ) : (
                            <div className="avail-list">
                              {availabilities.map(a => (
                                <div key={a._id} className="avail-week">
                                  <div className="avail-week-header">
                                    Week of {formatWeek(a.weekStarting)}
                                    <button className="btn btn-danger btn-sm" style={{ marginLeft: '0.75rem' }} onClick={() => handleDeleteAvail(a._id, u._id)}>Delete</button>
                                  </div>
                                  <div className="avail-days">
                                    {DAYS.map(day => {
                                      const d = a.days?.[day];
                                      return (
                                        <div key={day} className={`avail-day ${d?.available ? 'available' : 'unavailable'}`}>
                                          <span className="avail-day-name">{DAY_LABELS[day]}</span>
                                          {d?.available ? (
                                            <span className="avail-day-time">{d.startTime} - {d.endTime}</span>
                                          ) : (
                                            <span className="avail-day-time">Unavailable</span>
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
                      </>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
