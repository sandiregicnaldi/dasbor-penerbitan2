import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { STATUS_LABELS } from '../data/categories'
import {
    HiOutlineFolder, HiOutlineClock, HiOutlineExclamationTriangle,
    HiOutlineCheckCircle, HiOutlinePlus
} from 'react-icons/hi2'

export default function Dashboard() {
    const { projects, isAdmin, notifications, updateProject } = useApp()
    const navigate = useNavigate()
    const [expandedStat, setExpandedStat] = useState(null)

    // Auto-archive: projects completed > 2 months ago
    useEffect(() => {
        const now = new Date()
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
        projects.forEach(p => {
            const allDone = p.stages?.length > 0 && p.stages.every(s => s.status === 'done' || s.status === 'archived')
            if (!allDone) return
            const updated = new Date(p.updatedAt)
            if (updated < twoMonthsAgo) {
                updateProject(p.id, { status: 'archived' }).catch(() => { })
            }
        })
    }, [projects, updateProject])

    // Recent projects (last 8)
    const recentProjects = [...projects]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 8)

    // Get current stage of a project
    const getCurrentStage = (project) => {
        if (!project.stages || project.stages.length === 0) return null
        return project.stages.find(s =>
            s.status !== 'done' && s.status !== 'archived'
        ) || project.stages[project.stages.length - 1]
    }

    // Compute stat lists
    const activeProjects = projects.filter(p => {
        const stage = getCurrentStage(p)
        return stage && stage.status !== 'done' && stage.status !== 'archived'
    })

    const reviewPending = projects.filter(p =>
        p.stages?.some(s => s.status === 'review')
    )

    const overdueProjects = projects.filter(p => {
        const stage = getCurrentStage(p)
        if (!stage?.deadline || stage.status === 'done' || stage.status === 'archived') return false
        return new Date(stage.deadline) < new Date()
    })

    const now = new Date()
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
    const completedProjects = projects.filter(p => {
        const allDone = p.stages?.length > 0 && p.stages.every(s => s.status === 'done' || s.status === 'archived')
        if (!allDone) return false
        // Show if completed within the last 2 months
        const updated = new Date(p.updatedAt)
        return updated >= twoMonthsAgo
    })

    const statConfigs = [
        { key: 'active', label: 'Proyek Aktif', list: activeProjects, icon: <HiOutlineFolder />, color: 'blue' },
        { key: 'review', label: 'Menunggu Review', list: reviewPending, icon: <HiOutlineClock />, color: 'yellow' },
        { key: 'overdue', label: 'Terlambat', list: overdueProjects, icon: <HiOutlineExclamationTriangle />, color: 'red' },
        { key: 'completed', label: 'Proyek Selesai', list: completedProjects, icon: <HiOutlineCheckCircle />, color: 'green' },
    ]

    const getStatusBadge = (status) => {
        const map = {
            draft: 'badge-draft', active: 'badge-active', review: 'badge-review',
            revision: 'badge-revision', done: 'badge-done', archived: 'badge-archived'
        }
        return map[status] || 'badge-draft'
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }

    const formatDateTime = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const recentNotifs = notifications.slice(0, 5)

    const handleStatClick = (key) => {
        setExpandedStat(prev => prev === key ? null : key)
    }

    const expandedConfig = statConfigs.find(s => s.key === expandedStat)

    return (
        <div>
            {/* Stat Cards */}
            <div className="stat-cards">
                {statConfigs.map(stat => (
                    <div
                        key={stat.key}
                        className="stat-card"
                        style={{ cursor: 'pointer', outline: expandedStat === stat.key ? '2px solid var(--primary)' : undefined, borderRadius: 'var(--radius)' }}
                        onClick={() => handleStatClick(stat.key)}
                    >
                        <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
                        <div className="stat-info">
                            <h3>{stat.list.length}</h3>
                            <p>{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Expanded Stat List */}
            {expandedConfig && expandedConfig.list.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
                    <div className="card-header">
                        <div className="card-title">{expandedConfig.label} ({expandedConfig.list.length})</div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setExpandedStat(null)}>✕ Tutup</button>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Judul</th>
                                    <th>Tahap</th>
                                    <th>PJ</th>
                                    <th>Status</th>
                                    <th>Deadline</th>
                                    <th>Dibuat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expandedConfig.list.map(project => {
                                    const currentStage = getCurrentStage(project)
                                    const pj = currentStage?.pj || null
                                    const isOverdue = currentStage?.deadline && new Date(currentStage.deadline) < new Date() &&
                                        currentStage.status !== 'done' && currentStage.status !== 'archived'
                                    const isCompleted = expandedStat === 'completed'
                                    return (
                                        <tr
                                            key={project.id}
                                            className={isCompleted ? '' : 'clickable'}
                                            style={isCompleted ? { background: 'rgba(34,197,94,0.06)' } : undefined}
                                            onClick={isCompleted ? undefined : () => navigate(`/projects/${project.id}`)}
                                        >
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {project.id}
                                            </td>
                                            <td><strong>{project.title}</strong></td>
                                            <td style={{ fontSize: '0.75rem' }}>{currentStage?.label || '—'}</td>
                                            <td>{pj?.name || '—'}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadge(currentStage?.status)}`}>
                                                    {STATUS_LABELS[currentStage?.status] || 'Draft'}
                                                </span>
                                            </td>
                                            <td style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>
                                                {isOverdue && '⚠️ '}{formatDate(currentStage?.deadline)}
                                            </td>
                                            <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {formatDateTime(project.createdAt)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {expandedConfig && expandedConfig.list.length === 0 && (
                <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Tidak ada proyek untuk kategori "{expandedConfig.label}"
                    <br />
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setExpandedStat(null)}>Tutup</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
                {/* Project Table */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Proyek Terbaru</div>
                            <div className="card-subtitle">{projects.length} total proyek</div>
                        </div>
                        {isAdmin && (
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects/new')}>
                                <HiOutlinePlus /> Baru
                            </button>
                        )}
                    </div>

                    {recentProjects.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📁</div>
                            <h3>Belum ada proyek</h3>
                            <p>Klik tombol "Baru" untuk membuat proyek pertama.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Judul</th>
                                        <th>Kategori</th>
                                        <th>Tahap</th>
                                        <th>PJ</th>
                                        <th>Status</th>
                                        <th>Deadline</th>
                                        <th>Dibuat</th>
                                        <th>Folder</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentProjects.map(project => {
                                        const currentStage = getCurrentStage(project)
                                        const doneCount = project.stages?.filter(s => s.status === 'done' || s.status === 'archived').length || 0
                                        const totalStages = project.stages?.length || 0
                                        const pj = currentStage?.pj || null
                                        const isOverdue = currentStage?.deadline && new Date(currentStage.deadline) < new Date() &&
                                            currentStage.status !== 'done' && currentStage.status !== 'archived'

                                        return (
                                            <tr key={project.id} className="clickable" onClick={() => navigate(`/projects/${project.id}`)}>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {project.id}
                                                </td>
                                                <td><strong>{project.title}</strong></td>
                                                <td>
                                                    <span className="badge badge-draft">{project.categoryLabel}</span>
                                                </td>
                                                <td style={{ fontSize: '0.75rem' }}>
                                                    {currentStage?.label || '—'} ({doneCount}/{totalStages})
                                                </td>
                                                <td>{pj?.name || '—'}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadge(currentStage?.status)}`}>
                                                        {STATUS_LABELS[currentStage?.status] || 'Draft'}
                                                    </span>
                                                </td>
                                                <td style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? '700' : '400' }}>
                                                    {isOverdue && '⚠️ '}{formatDate(currentStage?.deadline)}
                                                </td>
                                                <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {formatDateTime(project.createdAt)}
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    {(currentStage?.resultLink || project.gdriveLink) ? (
                                                        <a href={currentStage?.resultLink || project.gdriveLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Buka Folder Pekerjaan">
                                                            📂
                                                        </a>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Recent Notifications */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">🔔 Notifikasi Terbaru</div>
                        </div>
                        {recentNotifs.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Belum ada notifikasi
                            </div>
                        ) : (
                            recentNotifs.map(n => (
                                <div key={n.id} style={{
                                    padding: '0.5rem 0',
                                    borderBottom: '1px solid var(--border-light)',
                                    fontSize: '0.8rem'
                                }}>
                                    <div style={{ fontWeight: 600 }}>{n.title}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{n.message}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
