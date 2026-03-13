import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { TEAM } from '../data/team'
import { CATEGORIES, STATUS_LABELS } from '../data/categories'
import { HiOutlineTableCells, HiOutlineDocumentText } from 'react-icons/hi2'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const TABS = [
    { key: 'rekap', label: '📁 Rekap Proyek', icon: '📁' },
    { key: 'terlambat', label: '⚠️ Proyek Terlambat', icon: '⚠️' },
    { key: 'produktivitas', label: '👤 Produktivitas Personil', icon: '👤' },
    { key: 'tahapan', label: '📊 Tahapan Proyek', icon: '📊' },
    { key: 'selesai', label: '✅ Proyek Selesai', icon: '✅' },
]

export default function Reports() {
    const { projects } = useApp()
    const [activeTab, setActiveTab] = useState('rekap')

    // Common filters
    const [filterCat, setFilterCat] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterYear, setFilterYear] = useState('')
    const [filterMonth, setFilterMonth] = useState('')
    const [searchTitle, setSearchTitle] = useState('')

    const handleCatChange = (val) => { setFilterCat(val); setFilterType('') }

    const typeOptions = useMemo(() => {
        if (!filterCat) return Object.values(CATEGORIES).flatMap(c => (c.types || []))
        return CATEGORIES[filterCat]?.types || []
    }, [filterCat])

    const years = useMemo(() =>
        [...new Set(projects.map(p => new Date(p.createdAt).getFullYear()))].sort((a, b) => b - a),
        [projects]
    )

    // Helper: get current stage
    const getCurrentStage = (project) => {
        if (!project.stages || project.stages.length === 0) return null
        return project.stages.find(s =>
            s.status === 'active' || s.status === 'review' || s.status === 'revision'
        ) || project.stages.find(s => s.status === 'draft') || project.stages[project.stages.length - 1]
    }

    // Helper: format date
    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    // Helper: days late
    const daysLate = (deadline) => {
        if (!deadline) return 0
        const diff = Math.floor((new Date() - new Date(deadline)) / (1000 * 60 * 60 * 24))
        return Math.max(0, diff)
    }

    // Helper: get all PJ names
    const getAllPJs = (project) => {
        if (!project.stages) return '—'
        const names = [...new Set(project.stages.filter(s => s.pj?.name).map(s => s.pj.name))]
        return names.length > 0 ? names.join(', ') : '—'
    }

    // Base filter
    const baseFilter = (p) => {
        if (filterCat && p.category !== filterCat) return false
        if (filterType && p.type !== filterType) return false
        if (filterYear) {
            if (new Date(p.createdAt).getFullYear().toString() !== filterYear) return false
        }
        if (filterMonth) {
            if ((new Date(p.createdAt).getMonth() + 1).toString() !== filterMonth) return false
        }
        if (searchTitle) {
            if (!p.title?.toLowerCase().includes(searchTitle.toLowerCase())) return false
        }
        return true
    }

    // ============ 1. REKAP PROYEK ============
    const rekapData = useMemo(() => {
        return projects.filter(baseFilter).map(p => {
            const stage = getCurrentStage(p)
            const catConfig = CATEGORIES[p.category] || {}
            const typeConfig = catConfig.types?.find(t => t.id === p.type)
            return {
                id: p.id,
                title: p.title,
                category: catConfig.label || p.category || '—',
                type: typeConfig?.label || p.type || '—',
                currentStage: stage?.label || '—',
                pj: stage?.pj?.name || '—',
                status: STATUS_LABELS[stage?.status] || 'Draft',
                statusRaw: stage?.status || 'draft',
                deadline: stage?.deadline ? formatDate(stage.deadline) : '—',
            }
        })
    }, [projects, filterCat, filterType, filterYear, filterMonth, searchTitle])

    // ============ 2. PROYEK TERLAMBAT ============
    const terlambatData = useMemo(() => {
        const result = []
        projects.filter(baseFilter).forEach(p => {
            const catConfig = CATEGORIES[p.category] || {}
            p.stages?.forEach(stage => {
                if (stage.deadline && new Date(stage.deadline) < new Date() &&
                    stage.status !== 'done' && stage.status !== 'archived') {
                    result.push({
                        projectId: p.id,
                        title: p.title,
                        category: catConfig.label || p.category || '—',
                        stage: stage.label,
                        pj: stage.pj?.name || '—',
                        deadline: formatDate(stage.deadline),
                        deadlineRaw: stage.deadline,
                        late: daysLate(stage.deadline),
                    })
                }
            })
        })
        return result.sort((a, b) => b.late - a.late)
    }, [projects, filterCat, filterType, filterYear, filterMonth])

    // ============ 3. PRODUKTIVITAS PERSONIL ============
    const produktivitasData = useMemo(() => {
        const filtered = projects.filter(baseFilter)
        return TEAM.filter(m => !m.isAdmin).map(member => {
            let activeCount = 0
            let doneCount = 0
            const activeStages = []
            const activeProjectNames = new Set()
            const doneProjectNames = new Set()

            filtered.forEach(project => {
                project.stages?.forEach(stage => {
                    if (stage.pjId === member.id || stage.pj?.id === member.id) {
                        if (stage.status === 'active' || stage.status === 'review' || stage.status === 'revision') {
                            activeCount++
                            activeProjectNames.add(project.title)
                            activeStages.push(`${stage.label} (${project.title})`)
                        }
                        if (stage.status === 'done' || stage.status === 'archived') {
                            doneCount++
                            doneProjectNames.add(project.title)
                        }
                    }
                })
            })

            return {
                name: member.name,
                activeProjects: activeProjectNames.size,
                activeStages: activeStages.length > 0 ? activeStages.join('; ') : '—',
                doneProjects: doneProjectNames.size,
                doneStages: doneCount,
            }
        }).sort((a, b) => b.doneStages - a.doneStages)
    }, [projects, filterCat, filterType, filterYear, filterMonth])

    // ============ 4. TAHAPAN PROYEK ============
    const tahapanData = useMemo(() => {
        const stageCount = {}
        projects.filter(baseFilter).forEach(p => {
            p.stages?.forEach(stage => {
                if (stage.status !== 'done' && stage.status !== 'archived') {
                    const label = stage.label || 'Unknown'
                    stageCount[label] = (stageCount[label] || 0) + 1
                }
            })
        })
        return Object.entries(stageCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
    }, [projects, filterCat, filterType, filterYear, filterMonth])

    const maxTahapanCount = Math.max(...tahapanData.map(d => d.count), 1)

    // ============ 5. PROYEK SELESAI ============
    const selesaiData = useMemo(() => {
        return projects.filter(p => {
            if (!baseFilter(p)) return false
            return p.stages?.length > 0 && p.stages.every(s => s.status === 'done' || s.status === 'archived')
        }).map(p => {
            const catConfig = CATEGORIES[p.category] || {}
            const typeConfig = catConfig.types?.find(t => t.id === p.type)
            // Find last done stage's update as completion date
            const lastDoneStage = [...(p.stages || [])].reverse().find(s => s.status === 'done' || s.status === 'archived')
            return {
                id: p.id,
                title: p.title,
                type: typeConfig?.label || p.type || '—',
                category: catConfig.label || p.category || '—',
                pj: getAllPJs(p),
                completedAt: formatDate(lastDoneStage?.updatedAt || p.updatedAt),
            }
        })
    }, [projects, filterCat, filterType, filterYear, filterMonth])

    // ============ RESET ============
    const resetFilters = () => {
        setFilterCat(''); setFilterType(''); setFilterYear(''); setFilterMonth(''); setSearchTitle('')
    }

    const hasFilters = filterCat || filterType || filterYear || filterMonth || searchTitle

    // ============ EXPORT ============
    const getStatusBadgeClass = (status) => {
        const map = { active: 'badge-active', review: 'badge-review', revision: 'badge-revision', done: 'badge-done', draft: 'badge-draft', archived: 'badge-archived' }
        return map[status] || 'badge-draft'
    }

    const exportExcel = () => {
        const wb = XLSX.utils.book_new()
        let data, headers, sheetName, filename

        switch (activeTab) {
            case 'rekap':
                headers = ['Judul Proyek', 'Kategori', 'Tipe Proyek', 'Tahap Saat Ini', 'PJ', 'Status', 'Deadline']
                data = rekapData.map(r => [r.title, r.category, r.type, r.currentStage, r.pj, r.status, r.deadline])
                sheetName = 'Rekap Proyek'
                filename = 'Rekap_Proyek'
                break
            case 'terlambat':
                headers = ['Judul Proyek', 'Tahap', 'PJ', 'Deadline', 'Keterlambatan (hari)']
                data = terlambatData.map(r => [r.title, r.stage, r.pj, r.deadline, r.late])
                sheetName = 'Proyek Terlambat'
                filename = 'Proyek_Terlambat'
                break
            case 'produktivitas':
                headers = ['Nama Personil', 'Proyek Aktif', 'Tahap yang Dikerjakan', 'Proyek Selesai']
                data = produktivitasData.map(r => [r.name, r.activeProjects, r.activeStages, r.doneProjects])
                sheetName = 'Produktivitas Personil'
                filename = 'Produktivitas_Personil'
                break
            case 'tahapan':
                headers = ['Nama Tahap', 'Jumlah Proyek']
                data = tahapanData.map(r => [r.name, r.count])
                sheetName = 'Tahapan Proyek'
                filename = 'Tahapan_Proyek'
                break
            case 'selesai':
                headers = ['Judul Proyek', 'Jenis Proyek', 'PJ', 'Tanggal Selesai']
                data = selesaiData.map(r => [r.title, r.type, r.pj, r.completedAt])
                sheetName = 'Proyek Selesai'
                filename = 'Proyek_Selesai'
                break
        }

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
        ws['!cols'] = headers.map(() => ({ wch: 30 }))
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const exportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' })
        const tabConfig = TABS.find(t => t.key === activeTab)
        doc.setFontSize(16)
        doc.text(`Laporan: ${tabConfig?.label?.replace(/^. /, '') || 'Laporan'}`, 14, 18)
        doc.setFontSize(9)
        doc.setTextColor(100)
        const filterParts = []
        if (filterCat) filterParts.push(`Kategori: ${CATEGORIES[filterCat]?.label || filterCat}`)
        if (filterYear) filterParts.push(`Tahun: ${filterYear}`)
        if (filterMonth) filterParts.push(`Bulan: ${MONTH_NAMES[parseInt(filterMonth) - 1]}`)
        doc.text(filterParts.length > 0 ? filterParts.join(' | ') : 'Semua data', 14, 24)
        doc.text(`Digenerate: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 29)
        doc.setTextColor(0)

        let head, body

        switch (activeTab) {
            case 'rekap':
                head = [['Judul Proyek', 'Kategori', 'Tipe Proyek', 'Tahap Saat Ini', 'PJ', 'Status', 'Deadline']]
                body = rekapData.map(r => [r.title, r.category, r.type, r.currentStage, r.pj, r.status, r.deadline])
                break
            case 'terlambat':
                head = [['Judul Proyek', 'Tahap', 'PJ', 'Deadline', 'Keterlambatan (hari)']]
                body = terlambatData.map(r => [r.title, r.stage, r.pj, r.deadline, `${r.late} hari`])
                break
            case 'produktivitas':
                head = [['Nama Personil', 'Proyek Aktif', 'Tahap yang Dikerjakan', 'Proyek Selesai']]
                body = produktivitasData.map(r => [r.name, r.activeProjects, r.activeStages, r.doneProjects])
                break
            case 'tahapan':
                head = [['Nama Tahap', 'Jumlah Proyek']]
                body = tahapanData.map(r => [r.name, r.count])
                break
            case 'selesai':
                head = [['Judul Proyek', 'Jenis Proyek', 'PJ', 'Tanggal Selesai']]
                body = selesaiData.map(r => [r.title, r.type, r.pj, r.completedAt])
                break
        }

        autoTable(doc, {
            startY: 34,
            head, body,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            didParseCell: (data) => {
                if (activeTab === 'terlambat' && data.section === 'body' && data.column.index === 4) {
                    data.cell.styles.textColor = [220, 38, 38]
                    data.cell.styles.fontStyle = 'bold'
                }
            }
        })

        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(7); doc.setTextColor(150)
            doc.text(`Sistem Manajemen Penerbitan — Halaman ${i}/${pageCount}`, 14, doc.internal.pageSize.height - 8)
        }

        const tabKey = TABS.find(t => t.key === activeTab)?.label?.replace(/^. /, '').replace(/\s/g, '_') || 'Laporan'
        doc.save(`${tabKey}_${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    // Determine which filters to show per tab
    const showCatFilter = ['rekap', 'terlambat', 'selesai'].includes(activeTab)
    const showTypeFilter = ['rekap'].includes(activeTab)
    const showSearch = ['rekap'].includes(activeTab)
    const showExport = ['rekap', 'terlambat', 'produktivitas', 'tahapan', 'selesai'].includes(activeTab)

    // Current tab data count
    const currentCount = {
        rekap: rekapData.length,
        terlambat: terlambatData.length,
        produktivitas: produktivitasData.length,
        tahapan: tahapanData.length,
        selesai: selesaiData.length,
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>📊 Laporan</h1>
                    <p>Monitoring proyek dan kinerja tim</p>
                </div>
                {showExport && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-success btn-sm" onClick={exportExcel} disabled={currentCount[activeTab] === 0}>
                            <HiOutlineTableCells /> Excel
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={exportPDF} disabled={currentCount[activeTab] === 0}>
                            <HiOutlineDocumentText /> PDF
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: '1rem' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                    >
                        {tab.label} ({currentCount[tab.key]})
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {showCatFilter && (
                        <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Kategori</label>
                            <select value={filterCat} onChange={e => handleCatChange(e.target.value)} style={{ fontSize: '0.8rem' }}>
                                <option value="">Semua Kategori</option>
                                {Object.entries(CATEGORIES).map(([key, cat]) => (
                                    <option key={key} value={key}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {showTypeFilter && (
                        <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Jenis Proyek</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: '0.8rem' }}>
                                <option value="">Semua Jenis</option>
                                {typeOptions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-group" style={{ marginBottom: 0, minWidth: '110px' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Tahun</label>
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ fontSize: '0.8rem' }}>
                            <option value="">Semua Tahun</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: '120px' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Bulan</label>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ fontSize: '0.8rem' }}>
                            <option value="">Semua Bulan</option>
                            {MONTH_NAMES.map((name, idx) => (
                                <option key={idx + 1} value={idx + 1}>{name}</option>
                            ))}
                        </select>
                    </div>
                    {showSearch && (
                        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Cari Judul</label>
                            <input
                                type="text"
                                placeholder="Cari judul proyek..."
                                value={searchTitle}
                                onChange={e => setSearchTitle(e.target.value)}
                                style={{ fontSize: '0.8rem' }}
                            />
                        </div>
                    )}
                    {hasFilters && (
                        <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ marginBottom: '2px' }}>
                            ✕ Reset
                        </button>
                    )}
                </div>
            </div>

            {/* ============ TAB 1: REKAP PROYEK ============ */}
            {activeTab === 'rekap' && (
                <div className="card">
                    {rekapData.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📁</div>
                            <h3>Tidak ada data</h3>
                            <p>Tidak ada proyek yang sesuai filter.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Judul Proyek</th>
                                        <th>Kategori</th>
                                        <th>Tipe Proyek</th>
                                        <th>Tahap Saat Ini</th>
                                        <th>PJ</th>
                                        <th>Status</th>
                                        <th>Deadline</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rekapData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{row.title}</strong></td>
                                            <td><span className="badge badge-draft">{row.category}</span></td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.type}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.currentStage}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.pj}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadgeClass(row.statusRaw)}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.deadline}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {rekapData.length > 0 && (
                        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 0 0', marginTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Total:</span> <strong>{rekapData.length}</strong></div>
                        </div>
                    )}
                </div>
            )}

            {/* ============ TAB 2: PROYEK TERLAMBAT ============ */}
            {activeTab === 'terlambat' && (
                <div className="card">
                    {terlambatData.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <h3>Tidak ada proyek terlambat</h3>
                            <p>Semua tahapan berjalan sesuai jadwal.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Judul Proyek</th>
                                        <th>Tahap</th>
                                        <th>PJ</th>
                                        <th>Deadline</th>
                                        <th>Keterlambatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {terlambatData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{row.title}</strong></td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.stage}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.pj}</td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{row.deadline}</td>
                                            <td>
                                                <span style={{
                                                    color: '#fff',
                                                    background: row.late > 7 ? 'var(--danger)' : 'var(--warning)',
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700
                                                }}>
                                                    {row.late} hari
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {terlambatData.length > 0 && (
                        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 0 0', marginTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Total terlambat:</span> <strong style={{ color: 'var(--danger)' }}>{terlambatData.length}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Rata-rata keterlambatan:</span> <strong>{Math.round(terlambatData.reduce((s, r) => s + r.late, 0) / terlambatData.length)} hari</strong></div>
                        </div>
                    )}
                </div>
            )}

            {/* ============ TAB 3: PRODUKTIVITAS PERSONIL ============ */}
            {activeTab === 'produktivitas' && (
                <div className="card">
                    {produktivitasData.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">👤</div>
                            <h3>Tidak ada data personil</h3>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nama Personil</th>
                                        <th style={{ textAlign: 'center' }}>Proyek Aktif</th>
                                        <th>Tahap yang Sedang Dikerjakan</th>
                                        <th style={{ textAlign: 'center' }}>Proyek Selesai</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {produktivitasData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{row.name}</strong></td>
                                            <td style={{ textAlign: 'center', fontWeight: 600, color: row.activeProjects > 0 ? 'var(--primary)' : 'inherit' }}>
                                                {row.activeProjects}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                                                {row.activeStages}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                                                {row.doneProjects}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {produktivitasData.length > 0 && (
                        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 0 0', marginTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Total Personil:</span> <strong>{produktivitasData.length}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Total Proyek Selesai:</span> <strong style={{ color: 'var(--success)' }}>{produktivitasData.reduce((s, r) => s + r.doneProjects, 0)}</strong></div>
                        </div>
                    )}
                </div>
            )}

            {/* ============ TAB 4: TAHAPAN PROYEK ============ */}
            {activeTab === 'tahapan' && (
                <div>
                    {/* Table */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        {tahapanData.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📊</div>
                                <h3>Tidak ada data tahapan</h3>
                                <p>Semua proyek sudah selesai atau belum ada proyek aktif.</p>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nama Tahap</th>
                                            <th style={{ textAlign: 'center' }}>Jumlah Proyek</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tahapanData.map((row, idx) => (
                                            <tr key={idx}>
                                                <td><strong>{row.name}</strong></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        background: 'var(--primary)',
                                                        color: '#fff',
                                                        padding: '0.15rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700
                                                    }}>
                                                        {row.count}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Chart */}
                    {tahapanData.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">📊 Distribusi Tahapan</div>
                            </div>
                            <div style={{ padding: '1rem' }}>
                                {tahapanData.map((row, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <div style={{ width: '180px', fontSize: '0.8rem', textAlign: 'right', fontWeight: 500, flexShrink: 0 }}>
                                            {row.name}
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '6px',
                                            height: '28px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                width: `${(row.count / maxTahapanCount) * 100}%`,
                                                height: '100%',
                                                background: `hsl(${210 + idx * 30}, 70%, 55%)`,
                                                borderRadius: '6px',
                                                transition: 'width 0.5s ease',
                                                minWidth: '30px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                paddingRight: '8px'
                                            }}>
                                                <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{row.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ============ TAB 5: PROYEK SELESAI ============ */}
            {activeTab === 'selesai' && (
                <div className="card">
                    {selesaiData.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <h3>Belum ada proyek selesai</h3>
                            <p>Proyek yang semua tahapannya telah diselesaikan akan muncul di sini.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Judul Proyek</th>
                                        <th>Jenis Proyek</th>
                                        <th>PJ</th>
                                        <th>Tanggal Selesai</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selesaiData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{row.title}</strong></td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.type}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.pj}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{row.completedAt}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {selesaiData.length > 0 && (
                        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 0 0', marginTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Total Selesai:</span> <strong style={{ color: 'var(--success)' }}>{selesaiData.length}</strong></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
