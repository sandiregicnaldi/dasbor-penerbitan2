import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TEAM } from '../data/team'
import { STATUS_LABELS } from '../data/categories'
import {
    HiOutlineFolder, HiOutlineClock, HiOutlineExclamationTriangle,
    HiOutlineCheckCircle, HiOutlinePlus
} from 'react-icons/hi2'

export default function Dashboard() {
    const { projects, activeProjects, reviewPending, overdueProjects,
        completedThisMonth, isAdmin, notifications } = useApp()
    const navigate = useNavigate()

    // Leaderboard — count completed stages per PJ
    const leaderboard = TEAM.filter(m => !m.isAdmin).map(member => {
        const completedStages = projects.reduce((count, project) => {
            return count + (project.stages?.filter(s =>
                s.pjId === member.id && (s.status === 'done' || s.status === 'archived')
            ).length || 0)
        }, 0)
        return { ...member, completedStages }
    }).sort((a, b) => b.completedStages - a.completedStages)

    const maxStages = Math.max(leaderboard[0]?.completedStages || 1, 1)

    // Recent projects (last 10)
    const recentProjects = [...projects]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 8)

    // Get current stage of a project
    const getCurrentStage = (project) => {
        if (!project.stages) return null
        const active = project.stages.find(s =>
            s.status === 'active' || s.status === 'review' || s.status === 'revision'
        )
        return active || project.stages.find(s => s.status === 'draft') || project.stages[project.stages.length - 1]
    }

    const getStatusBadge = (status) => {
        const map = {
            draft: 'badge-draft',
            active: 'badge-active',
            review: 'badge-review',
            revision: 'badge-revision',
            done: 'badge-done',
            archived: 'badge-archived'
        }
        return map[status] || 'badge-draft'
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }

    const recentNotifs = notifications.slice(0, 5)

    return (
        <div>
            {/* Stat Cards */}
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-icon blue"><HiOutlineFolder /></div>
                    <div className="stat-info">
                        <h3>{activeProjects.length}</h3>
                        <p>Proyek Aktif</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow"><HiOutlineClock /></div>
                    <div className="stat-info">
                        <h3>{reviewPending.length}</h3>
                        <p>Menunggu Review</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><HiOutlineExclamationTriangle /></div>
                    <div className="stat-info">
                        <h3>{overdueProjects.length}</h3>
                        <p>Terlambat</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><HiOutlineCheckCircle /></div>
                    <div className="stat-info">
                        <h3>{completedThisMonth.length}</h3>
                        <p>Selesai Bulan Ini</p>
                    </div>
                </div>
            </div>

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
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentProjects.map(project => {
                                        const currentStage = getCurrentStage(project)
                                        const doneCount = project.stages?.filter(s => s.status === 'done' || s.status === 'archived').length || 0
                                        const totalStages = project.stages?.length || 0
                                        const pj = currentStage?.pjId ? TEAM.find(m => m.id === currentStage.pjId) : null
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
                    {/* Leaderboard */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">🏆 Leaderboard PJ</div>
                        </div>
                        {leaderboard.map((member, idx) => (
                            <div key={member.id} className="leaderboard-item">
                                <div className={`leaderboard-rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default'}`}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{member.name}</div>
                                    <div className="leaderboard-bar">
                                        <div
                                            className="leaderboard-bar-fill"
                                            style={{ width: `${(member.completedStages / maxStages) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="leaderboard-count">{member.completedStages}</div>
                            </div>
                        ))}
                    </div>

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
