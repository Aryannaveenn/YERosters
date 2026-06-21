import { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '../context/AuthContext';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function getMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 1 ? (1 - day) : (8 - day);
  d.setDate(d.getDate() + diff);
  return toLocalDate(d);
}

function ShiftCard({ shift, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: shift._id || shift.tempId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="shift-card" {...attributes} {...listeners}>
      <strong>{shift.user?.name || 'Unknown'}</strong>
      {shift.school && <span className="school-tag">{shift.school.name || shift.school}</span>}
      <span>{shift.startTime} - {shift.endTime}</span>
      <button className="remove-btn" onClick={(e) => { e.stopPropagation(); onRemove(shift._id || shift.tempId); }}>x</button>
    </div>
  );
}

function DayColumn({ day, shifts, schools, onRemove }) {
  const daySchools = schools.filter(s => s.days.includes(day));
  return (
    <div className="day-column" data-day={day}>
      <h3>{DAY_LABELS[day]}</h3>
      {daySchools.length > 0 && (
        <div className="day-schools">
          {daySchools.map(s => <span key={s._id} className="day-school-label">{s.name}</span>)}
        </div>
      )}
      <div className="shifts-container">
        {shifts.map(shift => (
          <ShiftCard key={shift._id || shift.tempId} shift={shift} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

export default function RosterPage() {
  const { token } = useAuth();
  const [weekStarting, setWeekStarting] = useState(getMonday());
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [schools, setSchools] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [status, setStatus] = useState('');
  const [showGenMenu, setShowGenMenu] = useState(false);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [opHours, setOpHours] = useState({ startTime: '09:00', endTime: '17:00' });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadRoster = useCallback(async () => {
    try {
      const res = await fetch(`${API}/roster/${weekStarting}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
        setStatus(data.status);
      } else {
        setShifts([]);
        setStatus('');
      }
    } catch {
      setShifts([]);
    }
  }, [weekStarting, token]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  useEffect(() => {
    fetch(`${API}/users`, { headers }).then(r => r.json()).then(data => {
      setEmployees(data.filter(u => u.role === 'employee'));
    });
    fetch(`${API}/schools`, { headers }).then(r => r.json()).then(setSchools);
    fetch(`${API}/settings/operating-hours`, { headers }).then(r => r.json()).then(setOpHours);
  }, [token]);

  async function handleGenerate(customPrompt) {
    setGenerating(true);
    try {
      const body = { weekStarting };
      if (customPrompt) body.customPrompt = customPrompt;
      const res = await fetch(`${API}/roster/generate`, {
        method: 'POST', headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setShifts(data.shifts || []);
        setStatus(data.status);
      } else {
        alert(data.error || 'Failed to generate roster');
      }
    } catch (err) {
      alert('Error generating roster: ' + err.message);
    }
    setGenerating(false);
    setShowGenMenu(false);
    setShowPromptInput(false);
    setCustomPrompt('');
  }

  async function saveRoster(updatedShifts, newStatus) {
    const payload = updatedShifts.map(s => ({
      user: s.user._id || s.user,
      school: s.school?._id || s.school || null,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    const res = await fetch(`${API}/roster/${weekStarting}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ shifts: payload, status: newStatus || status || 'draft' }),
    });
    if (res.ok) {
      const data = await res.json();
      setShifts(data.shifts);
      setStatus(data.status);
    }
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overShift = shifts.find(s => (s._id || s.tempId) === over.id);
    if (!overShift) return;

    const updated = shifts.map(s => {
      if ((s._id || s.tempId) === active.id) {
        return { ...s, day: overShift.day };
      }
      return s;
    });
    setShifts(updated);
    saveRoster(updated);
  }

  function removeShift(shiftId) {
    const updated = shifts.filter(s => (s._id || s.tempId) !== shiftId);
    setShifts(updated);
    saveRoster(updated);
  }

  function addShift(employeeId, schoolId, day) {
    const emp = employees.find(e => e._id === employeeId);
    if (!emp) return;
    const school = schoolId ? schools.find(s => s._id === schoolId) : null;
    const newShift = {
      tempId: `temp-${Date.now()}`,
      user: { _id: emp._id, name: emp.name, email: emp.email },
      school: school ? { _id: school._id, name: school.name } : null,
      day,
      startTime: opHours.startTime,
      endTime: opHours.endTime,
    };
    const updated = [...shifts, newShift];
    setShifts(updated);
    saveRoster(updated);
  }

  function clearRoster() {
    if (!confirm('Clear all shifts from this roster?')) return;
    setShifts([]);
    saveRoster([], 'draft');
  }

  const activeShift = activeId ? shifts.find(s => (s._id || s.tempId) === activeId) : null;

  return (
    <div className="page">
      <div className="roster-header">
        <h2>Weekly Roster</h2>
        <div className="roster-controls">
          <input type="date" value={weekStarting} onChange={e => setWeekStarting(snapToMonday(e.target.value))} />
          <div className="dropdown">
            <button onClick={() => setShowGenMenu(!showGenMenu)} className="btn" disabled={generating}>
              {generating ? 'Generating...' : 'Generate with AI ▾'}
            </button>
            {showGenMenu && !generating && (
              <div className="dropdown-menu">
                <button onClick={() => { handleGenerate(); }}>Generate Roster</button>
                <button onClick={() => { setShowPromptInput(true); setShowGenMenu(false); }}>Generate with Prompt</button>
              </div>
            )}
          </div>
          <button onClick={() => saveRoster(shifts, 'published')} className="btn btn-success">
            Publish
          </button>
          <button onClick={clearRoster} className="btn btn-danger">
            Clear Roster
          </button>
          {status && <span className={`status-badge ${status}`}>{status}</span>}
        </div>
      </div>

      {showPromptInput && (
        <div className="prompt-bar">
          <input
            type="text"
            placeholder="e.g. Employee 1 and Employee 2 can't work together"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && customPrompt.trim()) handleGenerate(customPrompt); }}
          />
          <button className="btn" disabled={generating || !customPrompt.trim()} onClick={() => handleGenerate(customPrompt)}>
            {generating ? 'Generating...' : 'Generate'}
          </button>
          <button className="btn btn-sm" onClick={() => { setShowPromptInput(false); setCustomPrompt(''); }}>Cancel</button>
        </div>
      )}

      <div className="add-shift-bar">
        <select id="emp-select" defaultValue="">
          <option value="" disabled>Select employee...</option>
          {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
        <select id="school-select" defaultValue="">
          <option value="">No school</option>
          {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        {DAYS.map(day => (
          <button key={day} className="btn btn-sm" onClick={() => {
            const empSel = document.getElementById('emp-select');
            const schoolSel = document.getElementById('school-select');
            if (empSel.value) addShift(empSel.value, schoolSel.value, day);
          }}>+ {DAY_LABELS[day].slice(0, 3)}</button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="roster-grid">
          {DAYS.map(day => (
            <DayColumn
              key={day}
              day={day}
              shifts={shifts.filter(s => s.day === day)}
              schools={schools}
              onRemove={removeShift}
            />
          ))}
        </div>
        <DragOverlay>
          {activeShift ? (
            <div className="shift-card dragging">
              <strong>{activeShift.user?.name}</strong>
              {activeShift.school && <span className="school-tag">{activeShift.school.name}</span>}
              <span>{activeShift.startTime} - {activeShift.endTime}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
