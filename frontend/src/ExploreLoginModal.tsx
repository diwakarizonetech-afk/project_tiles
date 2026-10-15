import { useState, useEffect, type FormEvent } from 'react'
import {
  Lock,
  Unlock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X,
  CheckCircle2,
  MoveRight,
  Grid2X2,
  Layers,
  Home,
  Clock,
  Loader2
} from 'lucide-react'
import './explore-login.css'
import { saveExploreSession, EXPLORE_SESSION_EXPIRY_HOURS } from './authSession'
import { verifyExploreCredentials } from './api'

interface ExploreLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  targetTileName?: string
}

export function ExploreLoginModal({
  isOpen,
  onClose,
  onSuccess,
  targetTileName
}: ExploreLoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setError('')
      setIsSuccess(false)
      setIsLoading(false)
      // Lock body scroll
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSuccess && !isLoading) {
          onClose()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen, isSuccess, isLoading, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanUser = username.trim()
    const cleanPass = password.trim()

    if (!cleanUser || !cleanPass) {
      setError('Please enter both username and password.')
      return
    }

    setIsLoading(true)
    try {
      await verifyExploreCredentials(cleanUser, cleanPass)
      setIsSuccess(true)
      saveExploreSession()
      setTimeout(() => {
        onSuccess()
      }, 700)
    } catch (err: unknown) {
      setIsShaking(true)
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your backend .env.')
      setTimeout(() => setIsShaking(false), 500)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="explore-auth-backdrop" role="dialog" aria-modal="true">
      {/* Animated Ceramic Tiles in Backdrop */}
      <div className="tile-bg-ambient">
        <div className="floating-tile tile-1">
          <div className="floating-tile-inner">
            <span className="floating-tile-label">ALTIC BLACK</span>
            <span className="floating-tile-sub">4&apos; × 2&apos; Slab</span>
          </div>
        </div>
        <div className="floating-tile tile-2">
          <div className="floating-tile-inner">
            <span className="floating-tile-label">CRYSTAL AQUA</span>
            <span className="floating-tile-sub">Polished Granite</span>
          </div>
        </div>
        <div className="floating-tile tile-3">
          <div className="floating-tile-inner">
            <span className="floating-tile-label">ALTIC GOLD</span>
            <span className="floating-tile-sub">High Gloss Vein</span>
          </div>
        </div>
        <div className="floating-tile tile-4">
          <div className="floating-tile-inner">
            <span className="floating-tile-label">MARBLE RELIEF</span>
            <span className="floating-tile-sub">Fluted Wall Ceramic</span>
          </div>
        </div>
        <div className="tile-grid-ambient-lines" />
      </div>

      {/* Main Authentication Card */}
      <div className={`explore-auth-card ${isShaking ? 'auth-card-shake' : ''} ${isSuccess ? 'auth-card-success' : ''}`}>
        <button
          type="button"
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Back to home"
          title="Return to Home"
        >
          <X size={18} />
        </button>

        {/* Card Header & Brand */}
        <div className="auth-card-header">
          <div className="auth-tile-icon-wrap">
            <div className="animated-tile-cube">
              <div className="tile-mini-grid">
                <span className="cube-tile c1" />
                <span className="cube-tile c2" />
                <span className="cube-tile c3" />
                <span className="cube-tile c4" />
                <span className="cube-tile c5" />
                <span className="cube-tile c6" />
                <span className="cube-tile c7" />
                <span className="cube-tile c8" />
                <span className="cube-tile c9" />
              </div>
            </div>
          </div>

          <div className="auth-badge">
            <ShieldCheck size={13} className="text-amber-400" />
            <span>MJP 3D STUDIO · RESTRICTED ACCESS</span>
          </div>

          <h2 className="auth-title">
            Unlock the 3D Virtual Residence
          </h2>

          <p className="auth-desc">
            {targetTileName ? (
              <>
                You are entering the live showroom to preview <strong>{targetTileName}</strong> at 1:1 scale. Please sign in with your verified explore credentials.
              </>
            ) : (
              <>
                Access high-fidelity 1:1 porcelain slabs, custom wall studio, and interactive real-time lighting.
              </>
            )}
          </p>

          {/* Feature Badges */}
          <div className="auth-feature-strip">
            <div className="auth-feat-item">
              <Layers size={13} />
              <span>4&apos;×2&apos; &amp; 2&apos;×2&apos; Slabs</span>
            </div>
            <div className="auth-feat-item">
              <Grid2X2 size={13} />
              <span>Wall Studio</span>
            </div>
            <div className="auth-feat-item">
              <Clock size={13} className="text-amber-400" />
              <span>{EXPLORE_SESSION_EXPIRY_HOURS}h Auto-Lock</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {isSuccess && (
          <div className="auth-success-banner">
            <CheckCircle2 size={18} />
            <span>Credentials verified. Loading 3D residence…</span>
          </div>
        )}

        {/* Login Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field-group">
            <label htmlFor="explore-username" className="auth-label">
              <span>EXPLORE USERNAME</span>
              <span className="auth-field-hint">Backend Protected</span>
            </label>
            <div className="auth-input-wrap">
              <User size={17} className="auth-input-icon" />
              <input
                id="explore-username"
                type="text"
                required
                autoFocus
                disabled={isSuccess || isLoading}
                className="auth-input"
                placeholder="Enter explore username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label htmlFor="explore-password" className="auth-label">
              <span>EXPLORE PASSWORD</span>
              <span className="auth-field-hint">Backend Protected</span>
            </label>
            <div className="auth-input-wrap">
              <Lock size={17} className="auth-input-icon" />
              <input
                id="explore-password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isSuccess || isLoading}
                className="auth-input auth-input-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="auth-action-row">
            <button
              type="submit"
              disabled={isSuccess || isLoading}
              className={`auth-submit-btn ${isSuccess ? 'btn-success' : ''}`}
            >
              {isSuccess ? (
                <>
                  <Unlock size={17} />
                  <span>ACCESS GRANTED</span>
                </>
              ) : isLoading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>VERIFYING CREDENTIALS…</span>
                </>
              ) : (
                <>
                  <Lock size={17} />
                  <span>UNLOCK 3D STUDIO</span>
                  <MoveRight size={17} />
                </>
              )}
            </button>

            <button
              type="button"
              className="auth-cancel-btn"
              onClick={onClose}
              disabled={isSuccess || isLoading}
            >
              <Home size={15} />
              <span>Return to Home</span>
            </button>
          </div>
        </form>

        {/* Security watermark footer */}
        <div className="auth-card-footer">
          <span>MJP CERAMICS · THIRUVERUMBUR SURFACES STUDIO</span>
        </div>
      </div>
    </div>
  )
}
