import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TEAM } from '../data/team'

export default function Login() {
    const [selectedUser, setSelectedUser] = useState('')
    const { login } = useApp()
    const navigate = useNavigate()

    const handleLogin = (e) => {
        e.preventDefault()
        const user = TEAM.find(m => m.id === selectedUser)
        if (user) {
            login(user)
            navigate('/')
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <img src="/logo.png" alt="Logo" className="login-logo" />
                <h1>Sistem Manajemen Penerbitan</h1>
                <p className="login-subtitle">Integrated Workflow Control</p>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            required
                        >
                            <option value="">-- Pilih Pengguna --</option>
                            {TEAM.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.name} — {member.role}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={!selectedUser}>
                        🚀 Masuk ke Sistem
                    </button>
                </form>
            </div>
        </div>
    )
}
