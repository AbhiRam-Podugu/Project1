'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [silentHours, setSilentHours] = useState([]);
  const [message, setMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.auth.getSession();
      setUser(data.session && data.session.user ? data.session.user : null);
      setLoading(false);
    }
    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session && session.user ? session.user : null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSilentHours([]);
      return;
    }
    async function fetchSilentHours() {
      try {
        if (!user) return;
        const res = await fetch(`/api/silentHours?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setSilentHours(data);
        } else {
          setMessage('Failed to load silent hours');
        }
      } catch {
        setMessage('Error loading silent hours');
      }
    }
    fetchSilentHours();
  }, [user]);

  async function handleSchedule(e) {
    e.preventDefault();
    setMessage('');
    setEmailStatus('');
    if (!user) {
      setMessage('Please log in first.');
      return;
    }

    try {
      const res = await fetch('/api/silentHours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          startTime,
          endTime,
        }),
      });
      const json = await res.json();

      if (res.ok) {
        setMessage('Silent hour scheduled!');
        setSilentHours(prev => [...prev, json]);
        setStartTime('');
        setEndTime('');

        const emailRes = await fetch('/api/sendEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            subject: 'Silent Hour Scheduled',
            text: `Your silent hour from ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()} has been scheduled successfully.`,
          }),
        });

        if (emailRes.ok) {
          setEmailStatus('Confirmation email sent!');
        } else {
          setEmailStatus('Failed to send confirmation email.');
        }
      } else {
        setMessage(json.error || 'Failed to schedule');
      }
    } catch {
      setMessage('Internal error scheduling silent hour');
    }
  }

  async function handleFormSuccess() {
    const { data } = await supabase.auth.getSession();
    setUser(data.session && data.session.user ? data.session.user : null);
    setShowLogin(false);
    setShowSignup(false);
  }

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '18px' }}>Loading...</div>;
  }

  if (!user) {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>Quiet Hours Scheduler</h1>
        <div style={styles.buttonGroup}>
          <button style={styles.primaryBtn} onClick={() => { setShowLogin(true); setShowSignup(false); }}>Log In</button>
          <button style={styles.secondaryBtn} onClick={() => { setShowSignup(true); setShowLogin(false); }}>Sign Up</button>
        </div>
        {showLogin && <LoginForm onSuccess={handleFormSuccess} />}
        {showSignup && <SignupForm onSuccess={handleFormSuccess} />}
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Hello, {user.email}!</h1>
        <button style={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); setUser(null); }}>
          Log Out
        </button>
      </div>
      <section style={styles.section}>
        <h2 style={styles.subHeading}>Schedule Silent Hour</h2>
        <form onSubmit={handleSchedule} style={styles.form}>
          <div style={styles.inputGroup}>
            <label>Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label>End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <button type="submit" style={styles.primaryBtn}>
            Schedule
          </button>
        </form>
        {message && <p style={{ color: message.includes('success') || message === 'Silent hour scheduled!' ? 'green' : 'red', marginTop: 10 }}>{message}</p>}
        {emailStatus && <p style={{ color: emailStatus.includes('sent') ? 'green' : 'red', marginTop: 6 }}>{emailStatus}</p>}
      </section>
      <section style={styles.section}>
        <h2 style={styles.subHeading}>Your Silent Hours</h2>
        {silentHours.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#555' }}>No silent hours scheduled.</p>
        ) : (
          <ul style={styles.list}>
            {silentHours.map(({ _id, startTime, endTime }) => (
              <li key={_id} style={styles.listItem}>
                {new Date(startTime).toLocaleString()} &rarr; {new Date(endTime).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Logged in!');
      onSuccess();
    }
  }

  return (
    <form style={styles.authForm} onSubmit={handleLogin}>
      <h3 style={styles.formHeading}>Log In</h3>
      <input
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={e => setEmail(e.target.value.trim())}
        style={styles.input}
      />
      <input
        type="password"
        placeholder="Password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={styles.input}
      />
      <button type="submit" style={styles.primaryBtn}>Log In</button>
      {message && <p style={{ color: 'red', marginTop: 8 }}>{message}</p>}
    </form>
  );
}

function SignupForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSignup(e) {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Signup successful! Please verify your email.');
      onSuccess();
    }
  }

  return (
    <form style={styles.authForm} onSubmit={handleSignup}>
      <h3 style={styles.formHeading}>Sign Up</h3>
      <input
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={e => setEmail(e.target.value.trim())}
        style={styles.input}
      />
      <input
        type="password"
        placeholder="Password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={styles.input}
      />
      <button type="submit" style={styles.primaryBtn}>Sign Up</button>
      {message && <p style={{ color: 'green', marginTop: 8 }}>{message}</p>}
    </form>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: '3rem auto',
    padding: '2rem',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    boxShadow: '0 6px 15px rgba(0,0,0,0.1)',
  },
  heading: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    fontSize: '2.25rem',
    color: '#2c3e50',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  primaryBtn: {
    backgroundColor: '#2f80ed',
    color: '#fff',
    padding: '0.6rem 1.4rem',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
  },
  secondaryBtn: {
    backgroundColor: '#e0e0e0',
    color: '#333',
    padding: '0.6rem 1.4rem',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  logoutBtn: {
    padding: '0.4rem 1rem',
    borderRadius: 6,
    backgroundColor: '#eb5757',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
  },
  section: {
    marginBottom: '2rem',
  },
  subHeading: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
    borderBottom: '2px solid #2f80ed',
    paddingBottom: '0.3rem',
    color: '#2c3e50',
  },
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'flex-end',
  },
  inputGroup: {
    flex: '1 1 200px',
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: '0.5rem',
    borderRadius: 5,
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
  },
  list: {
    listStyle: 'none',
    padding: 0,
  },
  listItem: {
    backgroundColor: '#eaf3ff',
    padding: '0.7rem 1rem',
    marginBottom: '0.7rem',
    borderRadius: 6,
    color: '#2c3e50',
  },
  authForm: {
    maxWidth: 400,
    margin: '1rem auto',
    padding: '1.5rem',
    backgroundColor: '#fff',
    borderRadius: 10,
    boxShadow: '0 5px 12px rgba(0,0,0,0.08)',
  },
  formHeading: {
    marginBottom: '1rem',
    color: '#2c3e50',
  },
};