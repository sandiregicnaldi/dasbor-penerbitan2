import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { TEAM } from '../data/team'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'

export default function Archive() {
    const { projects } = useApp()
    const [filterCat, setFilterCat] = useState('')
    const [filterYear, setFilterYear] = useState('')
    const [search, setSearch] = useState('')

    // Projects with at least one archived stage
    const archivedProjects = projects.filter(p =>
        p.stages?.some(s => s.status === 'archived')
    )

    const filtered = archivedProjects.filter(p => {
        if (filterCat && p.category !== filterCat) return false
        if (filterYear) {
            const year = new Date(p.createdAt).getFullYear().toString()
            if (year !== filterYear) return false
        }
        if (search) {
            const term = search.toLowerCase()
            return p.title?.toLowerCase().includes(term) || p.id?.toLowerCase().includes(term)
        }
        return true
    })

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const years = [...new Set(archivedProjects.map(p => new Date(p.createdAt).getFullYear()))].sort((a, b) => b - a)

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>📦 Arsip Proyek</h1>
                    <p>{filtered.length} proyek diarsipkan</p>
                </div>
            </div>

            <div className="filter-bar">
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="">Semua Kategori</option>
                    <option value="terbitan">Terbitan</option>
                    <option value="medsos">Media Sosial</option>
                    <option value="keuangan">Keuangan</option>
                    <option value="lainnya">Lainnya</option>
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                    <option value="">Semua Tahun</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="input-with-icon search-input">
                    <input
                        type="text"
                        placeholder="Cari arsip..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <HiOutlineMagnifyingGlass className="input-icon" />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h3>Belum ada arsip</h3>
                        <p>Proyek yang sudah diarsipkan akan muncul di sini.</p>
                    </div>
                </div>
            ) : (
                filtered.map(project => {
                    const archivedStages = project.stages.filter(s => s.status === 'archived' || s.status === 'done')
                    return (
                        <div key={project.id} className="project-cluster">
                            <div className="cluster-header">
                                {project.id}: {project.title}
                            </div>
                            <div className="card">
                                {archivedStages.map((stage, idx) => {
                                    const stagePJ = stage.pjId ? TEAM.find(m => m.id === stage.pjId) : null
                                    return (
                                        <div key={stage.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.625rem 0',
                                            borderBottom: idx < archivedStages.length - 1 ? '1px solid var(--border-light)' : 'none'
                                        }}>
                                            <div className="stage-dot done" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>✓</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{stage.label}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    PJ: {stagePJ?.name || '—'} • {formatDate(stage.deadline)}
                                                </div>
                                            </div>
                                            {stage.resultLink && (
                                                <a href={stage.resultLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                                                    📄 Lihat Hasil
                                                </a>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}
