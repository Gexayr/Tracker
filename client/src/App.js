import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, Filler, BarElement } from 'chart.js';
import { Line, Radar, Bar } from 'react-chartjs-2';

// Chart.js registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler,
  BarElement,
);

// ---------- Configuration / Defaults ----------
const DEFAULT_HABITS = [
  { id: 1, name: 'Meditation', color: '#8ecae6' },
  { id: 2, name: 'Workout', color: '#219ebc' },
  { id: 3, name: 'Read 30 min', color: '#ffd166' },
  { id: 4, name: 'No sugar', color: '#06d6a0' }
];

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

// ---------- Simple Auth API helpers ----------
async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    let msg = 'Login failed';
    try { const j = await res.json(); msg = j?.message || msg; } catch (_) {}
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return res.json(); // { user, access_token }
}

async function apiRegister({ email, password, name }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  if (!res.ok) {
    let msg = 'Registration failed';
    try { const j = await res.json(); msg = j?.message || msg; } catch (_) {}
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return res.json(); // { user, access_token }
}

async function apiProfile(token) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Invalid session');
  return res.json();
}

async function apiGet(year, month, token) {
  const res = await fetch(`${API_BASE}/storage/${year}/${month}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function apiPut(year, month, payload, token) {
  const res = await fetch(`${API_BASE}/storage`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar' | 'radar'
  const [showHelp, setShowHelp] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('access_token') || '');
  const [userEmail, setUserEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Initialize month data
  const initDefaultMonth = useCallback(() => {
    const initData = {};
    DEFAULT_HABITS.forEach(h => (initData[h.id] = {}));
    setHabits(DEFAULT_HABITS);
    setData(initData);
    setChartType('line');
    // Try to persist to server but don't block UI
    if (token) {
      apiPut(year, month, { habits: DEFAULT_HABITS, data: initData, chartType: 'line' }, token).catch(() => {});
    }
  }, [year, month, token]);

  // Load profile if token exists
  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    (async () => {
      try {
        const p = await apiProfile(token);
        if (!cancelled) setUserEmail(p?.email || '');
      } catch (e) {
        console.warn('Profile check failed', e);
        if (!cancelled) {
          setUserEmail('');
          setToken('');
          localStorage.removeItem('access_token');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Load from server on mount / when year/month changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return; // require login
      try {
        const response = await apiGet(year, month, token);
        const payload = response?.payload;
        if (payload && !cancelled) {
          setHabits(payload.habits || DEFAULT_HABITS);
          setData(payload.data || {});
          if (payload.chartType) setChartType(payload.chartType);
          return;
        }
        if (!cancelled) initDefaultMonth();
      } catch (e) {
        console.warn('Failed to load from API', e);
        if (!cancelled) initDefaultMonth();
      }
    })();
    return () => { cancelled = true; };
  }, [year, month, initDefaultMonth, token]);

  // Persist changes to server
  useEffect(() => {
    if (!token) return;
    apiPut(year, month, { habits, data, chartType }, token).catch(() => {
      // No-op on failure; UI remains responsive
    });
  }, [habits, data, chartType, year, month, token]);

  const handleLogout = () => {
    setToken('');
    setUserEmail('');
    localStorage.removeItem('access_token');
  };

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

  // If not logged in, show auth form
  if (!token) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1 style={{marginTop:0,marginBottom:8}}>Habit Tracker</h1>
          <div className="tabs">
            <button className={authMode==='login'?'active':''} onClick={()=>{setAuthError('');setAuthMode('login');}}>Sign in</button>
            <button className={authMode==='signup'?'active':''} onClick={()=>{setAuthError('');setAuthMode('signup');}}>Sign up</button>
          </div>

          {authMode === 'login' ? (
            <LoginForm
              error={authError}
              onSubmit={async (email, password) => {
                setAuthError('');
                try {
                  const res = await apiLogin(email, password);
                  const t = res?.access_token;
                  if (t) {
                    localStorage.setItem('access_token', t);
                    setToken(t);
                    setUserEmail(res?.user?.email || email);
                  } else {
                    setAuthError('Token not received');
                  }
                } catch (e) {
                  setAuthError(e?.message || 'Login failed');
                }
              }}
            />
          ) : (
            <SignUpForm
              error={authError}
              onSubmit={async ({ name, email, password }) => {
                setAuthError('');
                try {
                  const res = await apiRegister({ name, email, password });
                  const t = res?.access_token;
                  if (t) {
                    localStorage.setItem('access_token', t);
                    setToken(t);
                    setUserEmail(res?.user?.email || email);
                  } else {
                    setAuthError('Token not received');
                  }
                } catch (e) {
                  setAuthError(e?.message || 'Registration failed');
                }
              }}
            />
          )}

          <div className="auth-divider"><span>or</span></div>
          <GoogleSignIn
            clientId={GOOGLE_CLIENT_ID}
            onToken={async (idToken) => {
              try {
                const res = await fetch(`${API_BASE}/auth/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idToken })
                });
                if (!res.ok) throw new Error('Google auth failed');
                const data = await res.json();
                const t = data?.access_token;
                if (t) {
                  localStorage.setItem('access_token', t);
                  setToken(t);
                  setUserEmail(data?.user?.email || '');
                } else {
                  setAuthError('Token not received');
                }
              } catch (e) {
                setAuthError(e?.message || 'Google sign-in failed');
              }
            }}
          />

          {!GOOGLE_CLIENT_ID ? (
            <p style={{marginTop:8,fontSize:12,opacity:.7}}>Google Sign-In is not configured. Set REACT_APP_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID in docker-compose.</p>
          ) : null}
        </div>
      </div>
    );
  }

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
          <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>
            {userEmail ? `Logged in as ${userEmail}` : ''}
          </span>
          <button className="smallbtn" style={{ marginLeft: 8 }} onClick={handleLogout}>Logout</button>
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
                  <li>Data is saved to your account on the server per month. Switch months with ◀ ▶.</li>
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
              <ProgressChart
                month={month}
                year={year}
                habits={habits}
                data={data}
                chartType={chartType}
                onChangeChartType={setChartType}
              />
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

function LoginForm({ error, onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await onSubmit(email.trim(), password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      {error ? <div style={{ color: 'crimson', fontSize: 13 }}>{error}</div> : null}
      <button className="smallbtn" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Login'}
      </button>
    </form>
  );
}

function SignUpForm({ error, onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await onSubmit({ name: name.trim() || null, email: email.trim(), password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        type="text"
        placeholder="Full name (optional)"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      {error ? <div style={{ color: 'crimson', fontSize: 13 }}>{error}</div> : null}
      <button className="smallbtn" type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Sign up'}
      </button>
    </form>
  );
}

function GoogleSignIn({ clientId, onToken }) {
  const ref = React.useRef(null);
  useEffect(() => {
    if (!clientId) return;
    const id = 'google-identity-services';
    const existing = document.getElementById(id);
    const init = () => {
      // @ts-ignore
      if (window.google && window.google.accounts && window.google.accounts.id) {
        // @ts-ignore
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            const idToken = response?.credential;
            if (idToken) onToken(idToken);
          },
        });
        // @ts-ignore
        window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320 });
      }
    };
    if (existing) {
      if (existing.getAttribute('data-loaded')) init();
      else existing.addEventListener('load', init);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.id = id;
    s.onload = () => { s.setAttribute('data-loaded', 'true'); init(); };
    document.head.appendChild(s);
    return () => {
      // no cleanup for global script to avoid reloading
    };
  }, [clientId, onToken]);

  return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><div ref={ref} /></div>;
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
                  className={`cell ${done ? 'done' : ''}`}
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

function ProgressChart({ month, year, habits, data, chartType, onChangeChartType }) {
  const days = new Date(year, month+1, 0).getDate();
  const labels = Array.from({ length: days }).map((_,i)=>i+1);
  const dailyPercent = labels.map(day => {
    let done=0;
    habits.forEach(h => { if(data[h.id]?.[day]) done++; });
    return habits.length ? Math.round(done/habits.length*100) : 0;
  });

  // For radar, compute per-habit percent across the month
  const habitPercents = habits.map(h => calculateHabitProgress(h.id, data, month, year));
  const habitLabels = habits.map(h => h.name);

  const lineOrBarData = {
    labels,
    datasets: [{
      label: 'Daily completion % (all habits)',
      data: dailyPercent,
      fill: chartType === 'line' ? false : true,
      tension: 0.3,
      borderWidth: 2,
      backgroundColor: 'rgba(33, 158, 188, 0.25)',
      borderColor: '#219ebc',
    }]
  };

  const radarData = {
    labels: habitLabels,
    datasets: [{
      label: 'Monthly completion by habit (%)',
      data: habitPercents,
      backgroundColor: 'rgba(6, 214, 160, 0.25)',
      borderColor: '#06d6a0',
      pointBackgroundColor: '#06d6a0',
      borderWidth: 2,
    }]
  };

  const commonOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
  };

  const lineOptions = {
    ...commonOptions,
    scales: { y: { beginAtZero: true, max: 100 } }
  };

  const barOptions = lineOptions;

  const radarOptions = {
    ...commonOptions,
    scales: { r: { beginAtZero: true, max: 100 } }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Progress Chart</h4>
        <div>
          <label style={{ marginRight: 8 }}>Chart type:</label>
          <select value={chartType} onChange={e => onChangeChartType(e.target.value)}>
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="radar">Radar (Spider)</option>
          </select>
        </div>
      </div>

      {chartType === 'line' && <Line data={lineOrBarData} options={lineOptions} />}
      {chartType === 'bar' && <Bar data={lineOrBarData} options={barOptions} />}
      {chartType === 'radar' && <Radar data={radarData} options={radarOptions} />}
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
