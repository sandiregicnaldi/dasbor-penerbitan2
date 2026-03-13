import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TEAM } from '../data/team'
import { STATUS_LABELS } from '../data/categories'
import { HiOutlinePlus, HiOutlineMagnifyingGlass } from 'react-icons/hi2'

export default function Projects() {
    const { projects, isAdmin } = useApp()
    const navigate = useNavigate()
    const [filterCat, setFilterCat] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [search, setSearch] = useState('')

    // Filter only non-fully-archived projects
    const activeProjects = projects.filter(p => {
        const hasActiveStage = p.stages?.some(s => s.status !== 'archived')
        return hasActiveStage || !p.stages?.length
    })

    const filteredProjects = activeProjects.filter(p => {
        if (filterCat && p.category !== filterCat) return false
        if (filterStatus) {
            const hasStatus = p.stages?.some(s => s.status === filterStatus)
            if (!hasStatus) return false
        }
        if (search) {
            const term = search.toLowerCase()
            return p.title?.toLowerCase().includes(term) ||
                p.id?.toLowerCase().includes(term) ||
                p.categoryLabel?.toLowerCase().includes(term)
        }
        return true
    })

    // Group by project ID (cluster)
    const clusters = {}
    filteredProjects.forEach(p => {
        const key = p.id
        if (!clusters[key]) clusters[key] = []
        clusters[key].push(p)
    })

    const getCurrentStage = (project) => {
        if (!project.stages) return null
        return project.stages.find(s =>
            s.status === 'active' || s.status === 'review' || s.status === 'revision'
        ) || project.stages.find(s => s.status === 'draft') || project.stages[0]
    }

    const getStatusBadge = (status) => {
        const map = {
            draft: 'badge-draft', active: 'badge-active', review: 'badge-review',
            revision: 'badge-revision', done: 'badge-done', archived: 'badge-archived'
        }
        return map[status] || 'badge-draft'
    }

    const isOverdue = (stage) => {
        if (!stage?.deadline || stage.status === 'done' || stage.status === 'archived') return false
        return new Date(stage.deadline) < new Date()
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Proyek</h1>
                    <p>{filteredProjects.length} proyek ditemukan</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
                    <HiOutlinePlus /> Proyek Baru
                </button>
            </div>

            {/* Filter bar */}
            <div className="filter-bar">
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="">Semua Kategori</option>
                    <option value="terbitan">Terbitan</option>
                    <option value="medsos">Media Sosial</option>
                    <option value="keuangan">Keuangan</option>
                    <option value="lainnya">Lainnya</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="active">Sedang Berjalan</option>
                    <option value="review">Menunggu Konfirmasi</option>
                    <option value="revision">Direvisi</option>
                    <option value="done">Selesai</option>
                </select>
                <div className="input-with-icon search-input">
                    <input
                        type="text"
                        placeholder="Cari proyek..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <HiOutlineMagnifyingGlass className="input-icon" />
                </div>
            </div>

            {/* Projects clustered */}
            {Object.keys(clusters).length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📁</div>
                        <h3>Tidak ada proyek</h3>
                        <p>{search || filterCat || filterStatus ? 'Coba ubah filter pencarian Anda.' : 'Belum ada proyek yang dibuat.'}</p>
                        {isAdmin && !search && !filterCat && !filterStatus && (
                            <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
                                <HiOutlinePlus /> Buat Proyek Pertama
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                Object.entries(clusters).map(([clusterId, clusterProjects]) => (
                    <div key={clusterId} className="project-cluster">
                        <div className="cluster-header">{clusterId}</div>
                        {clusterProjects.map(project => {
                            const currentStage = getCurrentStage(project)
                            const doneCount = project.stages?.filter(s => s.status === 'done' || s.status === 'archived').length || 0
                            const totalStages = project.stages?.length || 0
                            const pj = currentStage?.pjId ? TEAM.find(m => m.id === currentStage.pjId) : null
                            const overdue = isOverdue(currentStage)

                            return (
                                <div
                                    key={project.id}
                                    className={`project-card ${overdue ? 'overdue' : ''}`}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                >
                                    <div className="project-card-header">
                                        <div className="project-card-title">
                                            {project.categoryIcon || '📋'} {project.title}
                                        </div>
                                        <span className={`badge ${getStatusBadge(currentStage?.status)}`}>
                                            {STATUS_LABELS[currentStage?.status] || 'Draft'}
                                        </span>
                                    </div>
                                    <div className="project-card-meta">
                                        <span className="meta-item">
                                            {project.categoryLabel} • {project.typeLabel}
                                        </span>
                                        <span className="meta-item">
                                            📊 Tahap: {currentStage?.label || '—'} ({doneCount}/{totalStages})
                                        </span>
                                        <span className="meta-item">
                                            👤 {pj?.name || '—'}
                                        </span>
                                        <span className="meta-item" style={{ color: overdue ? 'var(--danger)' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
                                            {overdue ? '⚠️ ' : '📅 '}{formatDate(currentStage?.deadline)}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))
            )}
        </div>
    )
}
