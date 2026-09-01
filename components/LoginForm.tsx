'use client'

import { useState } from 'react'
import { Lock, Mail, ShieldAlert, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { getFirebaseAuth } from '@/lib/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'

interface LoginFormProps {
  onSuccess: (email: string) => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'webui@email.com'
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'webui1234'

  const [email, setEmail] = useState(adminEmail)
  const [password, setPassword] = useState(adminPassword)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Check direct env credentials
      if (email.trim().toLowerCase() === adminEmail.toLowerCase() && password === adminPassword) {
        onSuccess(email.trim())
        return
      }

      // 2. Try Firebase Auth if configured
      const auth = getFirebaseAuth()
      if (auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          if (userCredential.user) {
            onSuccess(userCredential.user.email || email)
            return
          }
        } catch {
          // Firebase auth failed, fall through to error
        }
      }

      setError('Invalid email address or password. Please try again.')
    } catch {
      setError('An unexpected error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="login-badge">
            <Lock size={20} className="login-lock-icon" />
          </div>
          <h2>Authentication Required</h2>
          <p className="login-sub">
            Galgotias Drone & Robotics Lab Environment Sensor System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error" role="alert">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="webui@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="auth-password">Password</label>
            <div className="input-wrapper">
              <KeyRound size={16} className="input-icon" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="login-hint">
          <small>Credentials loaded from <code>.env</code>:</small>
          <div className="hint-keys">
            <span>Email: <code>{adminEmail}</code></span>
            <span>Pass: <code>{adminPassword}</code></span>
          </div>
        </div>
      </div>
    </div>
  )
}
