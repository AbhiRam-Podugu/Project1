import { useState } from 'react';
import { supabase } from '../src/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();

    console.log(`Login email: "${email}" password: "${password}"`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      setMessage('Error: ' + error.message);
    } else {
      console.log('Login data:', data);
      setMessage('Login successful! Redirecting...');
      setEmail('');
      setPassword('');
      // Redirect to home or dashboard page after login
      router.push('/');
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '1rem' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <label>Email:</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          style={{ width: '100%', marginBottom: '1rem' }}
          placeholder="example@mail.com"
        />
        <label>Password:</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: '1rem' }}
          placeholder="Enter your password"
        />
        <button type="submit" style={{ width: '100%' }}>
          Log In
        </button>
      </form>
      <p>{message}</p>
    </div>
  );
}
