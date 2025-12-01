import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js registration
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ---------- Configuration / Defaults ----------
const DEFAULT_HABITS = [
  { id: 1, name: 'Meditation', color: '#8ecae6' },
  { id: 2, name: 'Workout', color: '#219ebc' },
  { id: 3, name: 'Read 30 min', color: '#ffd166' },
  { id: 4, name: 'No sugar', color: '#06d6a0' }
];

const API_BASE = process.env.REACT_APP_API_URL || '/api';

async function apiGet(year, month) {
  const res = await fetch(`${API_BASE}/storage/${year}/${month}`);
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function apiPut(year, month, payload) {
  const res = await fetch(`${API_BASE}/storage`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, payload }),
  });
  if (!res.ok) throw new Error('Failed to save');
  return res.json();
}

// ---------- App component ----------
export default function App() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [habits, setHabits] = useState([]);
  const [data, setData] = useState({});
  const [showHelp, setShowHelp] = useState(false);

  // Initialize month data
  const initDefaultMonth = useCallback(() => {
    const initData = {};
    DEFAULT_HABITS.forEach(h => (initData[h.id] = {}));
    setHabits(DEFAULT_HABITS);
    setData(initData);
    // Try to persist to server but don't block UI
    apiPut(year, month, { habits: DEFAULT_HABITS, data: initData }).catch(() => {});
  }, [year, month]);

  // Load from server on mount / when year/month changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiGet(year, month);
        const payload = response?.payload;
        if (payload && !cancelled) {
          setHabits(payload.habits || DEFAULT_HABITS);
          setData(payload.data || {});
          return;
        }
        if (!cancelled) initDefaultMonth();
      } catch (e) {
        console.warn('Falling back to defaults, API not reachable', e);
        if (!cancelled) initDefaultMonth();
      }
    })();
    return () => { cancelled = true; };
  }, [year, month, initDefaultMonth]);

  // Persist changes to server
  useEffect(() => {
    apiPut(year, month, { habits, data }).catch(() => {
      // No-op on failure; UI remains responsive
    });
  }, [habits, data, year, month]);

  const toggleDay = (habitId, day) => {
    setData(prev => {
      const copy = { ...prev };
      if (!copy[habitId]) copy[habitId] = {};
      copy[habitId][day] = !copy[habitId][day];
      return copy;
    });
  };

  const addHabit = (name) => {
    const id = Date.now();
    const color = randomColor();
    const newHabit = { id, name, color };
    setHabits(prev => [...prev, newHabit]);
    setData(prev => ({ ...prev, [id]: {} }));
  };

  const removeHabit = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setData(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const monthNames = useMemo(() => [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ], []);

  return (
    <div className="wrap">
      <header>
        <h1>Habit Tracker</h1>
        <div className="controls">
          <button onClick={() => {
            if (month === 0) { setMonth(11); setYear(y => y-1); }
            else setMonth(m => m-1);
          }}>◀</button>

          <div className="month-label">{monthNames[month]} {year}</div>

          <button onClick={() => {
            if (month === 11) { setMonth(0); setYear(y => y+1); }
            else setMonth(m => m+1);
          }}>▶</button>

          <button className="smallbtn" onClick={() => setShowHelp(s => !s)}>
            {showHelp ? 'Hide help' : 'Help'}
          </button>
        </div>
      </header>

      <main>
        <section className="left">
          <div className="panel">
            <h3>Habits</h3>
            <ul className="habit-list">
              {habits.map(h => (
                <li key={h.id}>
                  <span className="dot" style={{ background: h.color }} />
                  <span style={{ flex: 1 }}>{h.name}</span>
                  <button className="smallbtn" onClick={() => removeHabit(h.id)}>✕</button>
                </li>
              ))}
            </ul>

            <AddHabitForm onAdd={addHabit} />

            {showHelp && (
              <div style={{ marginTop:12 }} className="help panel">
                <p><strong>How it works:</strong></p>
                <ul>
                  <li>Click on a day cell to toggle completion for that habit.</li>
                  <li>Data is saved locally per month. Switch months with ◀ ▶.</li>
                  <li>Add or remove habits. Progress and chart update automatically.</li>
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="right">
          <div className="panel grid-wrap">
            <HabitGrid year={year} month={month} habits={habits} data={data} onToggle={toggleDay} />
          </div>

          <div className="summary-row">
            <div className="panel summary">
              <h4>Progress</h4>
              <ProgressSummary month={month} year={year} habits={habits} data={data} />
            </div>

            <div className="panel chart-wrap">
              <ProgressChart month={month} year={year} habits={habits} data={data} />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <small>Saved to server database.</small>
      </footer>
    </div>
  );
}

// ---------- Helper components & utils ----------
function AddHabitForm({ onAdd }) {
  const [text, setText] = useState('');
  return (
    <div className="add-row">
      <input
        value={text}
        placeholder="New habit name"
        onChange={e => setText(e.target.value)}
      />
      <button
        className="smallbtn"
        onClick={() => {
          if (!text.trim()) return;
          onAdd(text.trim());
          setText('');
        }}
      >
        Add
      </button>
    </div>
  );
}

function HabitGrid({ year, month, habits, data, onToggle }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekColors = ['#e8f5e9','#e3f2fd','#fff3e0','#f3e5f5','#fbe9e7'];

  function weekIndex(day) {
    const firstWeekday = new Date(year, month, 1).getDay();
    return Math.floor((firstWeekday + (day - 1)) / 7);
  }

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>Habit \\ Day</th>
          {Array.from({ length: daysInMonth }).map((_, i) => <th key={i+1}>{i+1}</th>)}
          <th>Month %</th>
        </tr>
      </thead>
      <tbody>
        {habits.map(h => (
          <tr key={h.id}>
            <td className="habit-name">
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span className="dot" style={{background:h.color}} />
                <strong>{h.name}</strong>
              </div>
            </td>

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i+1;
              const done = data[h.id]?.[day];
              const bg = weekColors[weekIndex(day) % weekColors.length];
              return (
                <td
                  key={day}
                  className={done ? 'done' : ''}
                  onClick={() => onToggle(h.id, day)}
                  style={{ background: done ? hexWithAlpha(h.color,0.45) : bg }}
                  title={`Day ${day}`}
                >
                  {done ? '✓' : ''}
                </td>
              );
            })}

            <td>
              <MonthPercent habit={h} data={data} month={month} year={year} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MonthPercent({ habit, data, month, year }) {
  const pct = calculateHabitProgress(habit.id, data, month, year);
  return <div style={{ fontWeight:700 }}>{pct}%</div>;
}

function ProgressSummary({ month, year, habits, data }) {
  const days = new Date(year, month+1, 0).getDate();
  const stats = habits.map(h => {
    const entries = data[h.id] || {};
    let done = 0;
    for(let d=1; d<=days; d++) if(entries[d]) done++;
    const percent = days ? Math.round((done/days)*100) : 0;
    return { id: h.id, name: h.name, percent };
  });

  return (
    <div>
      <ul>
        {stats.map(s => (
          <li key={s.id}>
            <span style={{width:140,display:'inline-block'}}>{s.name}</span>
            <div className="bar-wrap"><div className="bar" style={{width:`${s.percent}%`}} /></div>
            <strong>{s.percent}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressChart({ month, year, habits, data }) {
  const days = new Date(year, month+1, 0).getDate();
  const labels = Array.from({ length: days }).map((_,i)=>i+1);
  const dailyPercent = labels.map(day => {
    let done=0;
    habits.forEach(h => { if(data[h.id]?.[day]) done++; });
    return habits.length ? Math.round(done/habits.length*100) : 0;
  });

  const chartData = {
    labels,
    datasets: [{
      label: 'Daily completion % (all habits)',
      data: dailyPercent,
      fill:false,
      tension:0.3,
      borderWidth:2
    }]
  };

  const options = {
    responsive:true,
    plugins:{ legend:{ position:'top' } },
    scales:{ y:{ beginAtZero:true, max:100 } }
  };

  return (
    <div>
      <h4>Month Chart</h4>
      <Line data={chartData} options={options} />
    </div>
  );
}

// ---------- Utilities ----------
function randomColor() {
  const colors = ['#8ecae6','#219ebc','#ffd166','#06d6a0','#f783ac','#bdb2ff','#ffb4a2'];
  return colors[Math.floor(Math.random()*colors.length)];
}

function calculateHabitProgress(habitId, data, month, year) {
  const entries = data[habitId] || {};
  const today = new Date();
  const isThisMonth = today.getFullYear()===year && today.getMonth()===month;
  const daysPassed = isThisMonth ? today.getDate() : new Date(year, month+1,0).getDate();
  let completed=0;
  for(let d=1; d<=daysPassed; d++) if(entries[d]) completed++;
  return Math.round(completed/daysPassed*100);
}

function hexWithAlpha(hex, alpha) {
  const c = hex.replace('#','');
  const r=parseInt(c.substring(0,2),16);
  const g=parseInt(c.substring(2,4),16);
  const b=parseInt(c.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
