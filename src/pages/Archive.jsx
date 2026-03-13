import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../services/api'
import { CATEGORIES } from '../data/categories'
import { HiOutlineMagnifyingGlass, HiOutlineArrowDownTray } from 'react-icons/hi2'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function Archive() {
    const { currentUser, projects } = useApp()
    const [archivedProjects, setArchivedProjects] = useState([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [filterCat, setFilterCat] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterYear, setFilterYear] = useState('')
    const [filterMonth, setFilterMonth] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch archived projects from API + completed from current projects
    useEffect(() => {
        if (!currentUser) return
        setLoading(true)
        api.projects.getArchived()
            .then(archivedData => {
                // Combine: archived from API + completed projects from normal list
                const completedFromDashboard = projects.filter(p =>
                    p.stages?.length > 0 && p.stages.every(s => s.status === 'done' || s.status === 'archived')
                )

                // Merge and deduplicate by ID
                const allMap = new Map()
                    ;[...archivedData, ...completedFromDashboard].forEach(p => {
                        if (!allMap.has(p.id)) allMap.set(p.id, p)
                    })

                // Enrich with category/type labels
                const enriched = [...allMap.values()].map(p => {
                    const catConfig = CATEGORIES[p.category] || {}
                    const typeConfig = catConfig.types?.find(t => t.id === p.type)
                    return {
                        ...p,
                        categoryLabel: catConfig.label || p.category || '—',
                        typeLabel: typeConfig?.label || p.type || '—',
                    }
                })
                setArchivedProjects(enriched)
            })
            .catch(e => console.error('Failed to fetch archived projects:', e))
            .finally(() => setLoading(false))
    }, [currentUser, projects])

    // Get all PJ names for a project
    const getProjectPJs = (project) => {
        if (!project.stages || project.stages.length === 0) return '—'
        const pjNames = [...new Set(
            project.stages
                .filter(s => s.pj?.name)
                .map(s => s.pj.name)
        )]
        return pjNames.length > 0 ? pjNames.join(', ') : '—'
    }

    // Get document link (last stage with resultLink)
    const getDocumentLink = (project) => {
        if (!project.stages) return null
        for (let i = project.stages.length - 1; i >= 0; i--) {
            if (project.stages[i].resultLink) return project.stages[i].resultLink
        }
        return project.gdriveLink || null
    }

    // Dynamic type options based on selected category
    const typeOptions = useMemo(() => {
        if (!filterCat) {
            // Collect all types from all categories
            return Object.values(CATEGORIES).flatMap(c =>
                (c.types || []).map(t => ({ id: t.id, label: t.label }))
            )
        }
        return CATEGORIES[filterCat]?.types || []
    }, [filterCat])

    // Dynamic year/month options from data
    const years = useMemo(() =>
        [...new Set(archivedProjects.map(p => new Date(p.createdAt).getFullYear()))].sort((a, b) => b - a),
        [archivedProjects]
    )

    // Filtered results
    const filtered = useMemo(() => {
        return archivedProjects.filter(p => {
            if (filterCat && p.category !== filterCat) return false
            if (filterType && p.type !== filterType) return false
            if (filterYear) {
                const year = new Date(p.createdAt).getFullYear().toString()
                if (year !== filterYear) return false
            }
            if (filterMonth) {
                const month = (new Date(p.createdAt).getMonth() + 1).toString()
                if (month !== filterMonth) return false
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                return p.title?.toLowerCase().includes(term)
            }
            return true
        })
    }, [archivedProjects, filterCat, filterType, filterYear, filterMonth, searchTerm])

    // Handle search button click
    const handleSearch = () => setSearchTerm(searchInput)
    const handleSearchKeyDown = (e) => { if (e.key === 'Enter') handleSearch() }

    // Reset type when category changes
    const handleCategoryChange = (val) => {
        setFilterCat(val)
        setFilterType('')
    }

    // Export helpers
    const getExportData = () => filtered.map(p => ({
        'Judul Proyek': p.title,
        'Kategori': p.categoryLabel,
        'Tipe Proyek': p.typeLabel,
        'Penanggung Jawab': getProjectPJs(p),
        'Dokumen Final': getDocumentLink(p) || '—',
    }))

    const exportExcel = () => {
        const data = getExportData()
        const ws = XLSX.utils.json_to_sheet(data)
        // Set column widths
        ws['!cols'] = [
            { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 50 }
        ]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Arsip Proyek')
        XLSX.writeFile(wb, `arsip_proyek_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const exportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' })
        doc.setFontSize(16)
        doc.text('Arsip Proyek', 14, 20)
        doc.setFontSize(9)
        doc.setTextColor(100)
        doc.text(`Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 27)

        const data = getExportData()
        autoTable(doc, {
            startY: 33,
            head: [['Judul Proyek', 'Kategori', 'Tipe Proyek', 'Penanggung Jawab', 'Dokumen Final']],
            body: data.map(d => [d['Judul Proyek'], d['Kategori'], d['Tipe Proyek'], d['Penanggung Jawab'], d['Dokumen Final']]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            columnStyles: {
                0: { cellWidth: 65 },
                4: { cellWidth: 60, textColor: [59, 130, 246] },
            },
        })

        doc.save(`arsip_proyek_${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>📦 Arsip Proyek</h1>
                    <p>{filtered.length} proyek ditemukan</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={exportExcel}
                        disabled={filtered.length === 0}
                        title="Unduh Excel"
                    >
                        <HiOutlineArrowDownTray /> Excel
                    </button>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={exportPDF}
                        disabled={filtered.length === 0}
                        title="Unduh PDF"
                    >
                        <HiOutlineArrowDownTray /> PDF
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <select value={filterCat} onChange={e => handleCategoryChange(e.target.value)} style={{ minWidth: '140px' }}>
                    <option value="">Semua Kategori</option>
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.label}</option>
                    ))}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ minWidth: '160px' }}>
                    <option value="">Semua Jenis Proyek</option>
                    {typeOptions.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ minWidth: '120px' }}>
                    <option value="">Semua Tahun</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ minWidth: '130px' }}>
                    <option value="">Semua Bulan</option>
                    {MONTH_NAMES.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>{name}</option>
                    ))}
                </select>
                <div style={{ display: 'flex', gap: '0.25rem', flex: 1, minWidth: '200px' }}>
                    <div className="input-with-icon search-input" style={{ flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Cari arsip..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                        />
                        <HiOutlineMagnifyingGlass className="input-icon" />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleSearch}>
                        Cari
                    </button>
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="card">
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Memuat arsip...
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h3>Belum ada arsip</h3>
                        <p>Proyek yang sudah selesai akan muncul di sini.</p>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Judul Proyek</th>
                                    <th>Kategori</th>
                                    <th>Tipe Proyek</th>
                                    <th>PJ</th>
                                    <th>Dokumen Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(project => {
                                    const docLink = getDocumentLink(project)
                                    return (
                                        <tr key={project.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{project.title}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                    {project.id}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-draft">{project.categoryLabel}</span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem' }}>{project.typeLabel}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{getProjectPJs(project)}</td>
                                            <td>
                                                {docLink ? (
                                                    <a
                                                        href={docLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-primary btn-sm"
                                                        style={{ fontSize: '0.75rem' }}
                                                    >
                                                        📥 Unduh
                                                    </a>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
