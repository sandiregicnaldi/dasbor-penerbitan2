import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { HiOutlineCheck, HiOutlineXMark, HiOutlinePencil } from 'react-icons/hi2'

const SKILL_OPTIONS = [
    'administrasi', 'editor', 'isbn', 'penerjemah', 'distribusi',
    'konten', 'keuangan', 'layout', 'desain', 'qc'
]

export default function UserManagement() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editSkills, setEditSkills] = useState([])

    const fetchUsers = async () => {
        try {
            const data = await api.admin.getUsers()
            setUsers(data)
        } catch (e) {
            console.error('Failed to load users:', e)
        }
        setLoading(false)
    }

    useEffect(() => { fetchUsers() }, [])

    const handleStatusChange = async (userId, newStatus) => {
        try {
            await api.admin.updateUser(userId, { status: newStatus })
            await fetchUsers()
        } catch (e) {
            alert('Gagal update status: ' + e.message)
        }
    }

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.admin.updateUser(userId, { role: newRole })
            await fetchUsers()
        } catch (e) {
            alert('Gagal update role: ' + e.message)
        }
    }

    const startEditSkills = (user) => {
        setEditingId(user.id)
        setEditSkills(user.skills || [])
    }

    const saveSkills = async (userId) => {
        try {
            await api.admin.updateUser(userId, { skills: editSkills })
            setEditingId(null)
            await fetchUsers()
        } catch (e) {
            alert('Gagal update skills: ' + e.message)
        }
    }

    const toggleSkill = (skill) => {
        setEditSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        )
    }

    const statusBadge = (status) => {
        const colors = {
            active: { bg: '#d4edda', color: '#155724' },
            pending: { bg: '#fff3cd', color: '#856404' },
            disabled: { bg: '#f8d7da', color: '#721c24' },
        }
        const c = colors[status] || colors.pending
        return (
            <span style={{
                padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem',
                fontWeight: 600, background: c.bg, color: c.color
            }}>
                {status === 'active' ? '✅ Aktif' : status === 'pending' ? '⏳ Pending' : '🚫 Nonaktif'}
            </span>
        )
    }

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat data user...</div>

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>👥 Manajemen User</h1>
                    <p>Kelola akun, role, dan persetujuan pengguna</p>
                </div>
            </div>

            <div className="card">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Nama</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Skills</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td style={{ fontWeight: 600 }}>{user.name}</td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</td>
                                    <td>
                                        <select
                                            value={user.role || 'personil'}
                                            onChange={e => handleRoleChange(user.id, e.target.value)}
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px' }}
                                        >
                                            <option value="personil">Personil</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td>{statusBadge(user.status || 'pending')}</td>
                                    <td>
                                        {editingId === user.id ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxWidth: '300px' }}>
                                                {SKILL_OPTIONS.map(skill => (
                                                    <button
                                                        key={skill}
                                                        type="button"
                                                        onClick={() => toggleSkill(skill)}
                                                        style={{
                                                            padding: '0.15rem 0.5rem',
                                                            fontSize: '0.7rem',
                                                            borderRadius: '12px',
                                                            border: '1px solid var(--border)',
                                                            background: editSkills.includes(skill) ? 'var(--primary)' : 'transparent',
                                                            color: editSkills.includes(skill) ? '#fff' : 'var(--text)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {skill}
                                                    </button>
                                                ))}
                                                <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                                                    <button className="btn btn-primary btn-sm" onClick={() => saveSkills(user.id)}>
                                                        <HiOutlineCheck /> Simpan
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                                                        <HiOutlineXMark /> Batal
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {(user.skills || []).length > 0 ? (
                                                    (user.skills || []).map(skill => (
                                                        <span
                                                            key={skill}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                                padding: '0.15rem 0.5rem', fontSize: '0.75rem',
                                                                borderRadius: '12px', background: 'var(--bg-secondary)',
                                                                border: '1px solid var(--border)'
                                                            }}
                                                        >
                                                            {skill}
                                                            <button
                                                                onClick={async () => {
                                                                    const updated = user.skills.filter(s => s !== skill)
                                                                    try {
                                                                        await api.admin.updateUser(user.id, { skills: updated })
                                                                        await fetchUsers()
                                                                    } catch (e) {
                                                                        alert('Gagal hapus skill: ' + e.message)
                                                                    }
                                                                }}
                                                                style={{
                                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                                    color: 'var(--danger)', fontSize: '0.8rem', padding: 0,
                                                                    lineHeight: 1, fontWeight: 700
                                                                }}
                                                                title={`Hapus skill ${skill}`}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                                                )}
                                                <button className="btn btn-ghost btn-sm" onClick={() => startEditSkills(user)} title="Tambah skill">
                                                    <HiOutlinePencil />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                            {user.status === 'pending' && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleStatusChange(user.id, 'active')}
                                                >
                                                    ✅ Approve
                                                </button>
                                            )}
                                            {user.status === 'active' && (
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    style={{ borderColor: '#dc3545', color: '#dc3545' }}
                                                    onClick={() => handleStatusChange(user.id, 'disabled')}
                                                >
                                                    🚫 Nonaktifkan
                                                </button>
                                            )}
                                            {user.status === 'disabled' && (
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    onClick={() => handleStatusChange(user.id, 'active')}
                                                >
                                                    🔄 Aktifkan
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
