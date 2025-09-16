import { useState } from 'react';
import { supabase } from '../src/lib/supabaseClient';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSignup(e) {
    e.preventDefault();

    console.log(`Signup email: "${email}" password: "${password}"`);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Signup error:', error);
      setMessage('Error: ' + error.message);
    } else {
      console.log('Signup data:', data);
      setMessage('Sign-up successful! Please check your email to confirm.');
      setEmail('');
      setPassword('');
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '1rem' }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup}>
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
          Sign Up
        </button>
      </form>
      <p>{message}</p>
    </div>
  );
}
