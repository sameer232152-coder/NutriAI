import { useState } from 'react'
import { supabase } from './supabase'

export default function AuthScreen() {
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (isSigningUp) {
        const result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        })
        if (result.error) throw result.error
        if (result.data.session) {
          const signOutResult = await supabase.auth.signOut()
          if (signOutResult.error) throw signOutResult.error
        }
        setIsSigningUp(false)
        setPassword('')
        setMessage(result.data.session
          ? 'Account created. Sign in to create your nutrition profile.'
          : 'Account created. Confirm your email, then sign in to create your nutrition profile.')
        return
      }

      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (result.error) throw result.error
      setMessage('Signed in. Loading your nutrition profile...')
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setIsSigningUp((current) => !current)
    setError('')
    setMessage('')
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <a className="auth-brand" href="#home" aria-label="NutriAI home">
          <img src="/NutriAI%20Smart%20Nutrition%20Logo.png" alt="" />
          <span>Nutri<span>Ai</span></span>
        </a>
        <div className="eyebrow">YOUR PERSONAL NUTRITION SPACE</div>
        <h1 id="auth-title">{isSigningUp ? 'Create your account.' : 'Welcome back.'}</h1>
        <p className="auth-description">{isSigningUp ? 'Save your meals and progress securely.' : 'Sign in to continue to your nutrition dashboard.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {isSigningUp && <label className="form-field full-field">Name<input autoComplete="name" maxLength="80" required value={name} onChange={(event) => setName(event.target.value)} /></label>}
          <label className="form-field full-field">Email<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="form-field full-field">Password<input autoComplete={isSigningUp ? 'new-password' : 'current-password'} type="password" minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait...' : isSigningUp ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{isSigningUp ? 'Already have an account?' : 'New to NutriAI?'} <button type="button" onClick={switchMode}>{isSigningUp ? 'Sign in' : 'Create account'}</button></p>
      </section>
    </main>
  )
}