import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../services/api'

export default function Login() {
    const [isRegister, setIsRegister] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { login } = useApp()
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        const result = await login(email, password)
        if (result === true) {
            navigate('/')
        } else if (result === 'pending') {
            setError('Akun Anda masih menunggu persetujuan admin.')
        } else if (result === 'disabled') {
            setError('Akun Anda telah dinonaktifkan. Hubungi admin.')
        } else {
            setError('Login gagal. Periksa email dan password Anda.')
        }
        setIsSubmitting(false)
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setIsSubmitting(true)

        try {
            await api.auth.signUp({ name, email, password })
            setSuccess('Pendaftaran berhasil! Akun Anda menunggu persetujuan admin.')
            setIsRegister(false)
            setName('')
            setPassword('')
        } catch (err) {
            setError(err.message || 'Pendaftaran gagal. Coba lagi.')
        }
        setIsSubmitting(false)
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <img src="/logo.png" alt="Logo" className="login-logo" />
                <h1>Sistem Manajemen Penerbitan</h1>
                <p className="login-subtitle">Integrated Workflow Control</p>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success" style={{ background: '#d4edda', color: '#155724', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}

                {isRegister ? (
                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <input
                                type="text"
                                className="form-control"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nama Lengkap"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nama@penerbitan.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password (min 8 karakter)"
                                minLength={8}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={isSubmitting || !name || !email || !password}
                        >
                            {isSubmitting ? 'Mendaftar...' : '📝 Daftar Akun'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nama@penerbitan.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={isSubmitting || !email || !password}
                        >
                            {isSubmitting ? 'Memuat...' : '🚀 Masuk ke Sistem'}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess('') }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                    >
                        {isRegister ? '← Kembali ke Login' : 'Belum punya akun? Daftar di sini'}
                    </button>
                </div>
            </div>
        </div>
    )
}
