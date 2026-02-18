import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { TEAM } from '../data/team'
import { CATEGORIES, STATUS_LABELS } from '../data/categories'
import { HiOutlineArrowDownTray, HiOutlineTableCells, HiOutlineDocumentText } from 'react-icons/hi2'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Reports() {
    const { projects } = useApp()

    // Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [filterCat, setFilterCat] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterPJ, setFilterPJ] = useState('')
    const [activeTab, setActiveTab] = useState('projects') // 'projects' | 'performance'

    // Filtered projects
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            if (dateFrom) {
                const projDate = new Date(p.date || p.createdAt)
                if (projDate < new Date(dateFrom)) return false
            }
            if (dateTo) {
                const projDate = new Date(p.date || p.createdAt)
                if (projDate > new Date(dateTo + 'T23:59:59')) return false
            }
            if (filterCat && p.category !== filterCat) return false
            if (filterType && p.type !== filterType) return false
            if (filterPJ) {
                const hasPJ = p.stages?.some(s => s.pjId === filterPJ)
                if (!hasPJ) return false
            }
            return true
        })
    }, [projects, dateFrom, dateTo, filterCat, filterType, filterPJ])

    // Type options based on selected category
    const typeOptions = filterCat ? (CATEGORIES[filterCat]?.types || []) : []

    // Project report data
    const projectReportData = useMemo(() => {
        return filteredProjects.map(p => {
            const totalStages = p.stages?.length || 0
            const doneStages = p.stages?.filter(s => s.status === 'done' || s.status === 'archived').length || 0
            const currentStage = p.stages?.find(s =>
                s.status === 'active' || s.status === 'review' || s.status === 'revision'
            ) || p.stages?.find(s => s.status === 'draft')
            const currentPJ = currentStage?.pjId ? TEAM.find(m => m.id === currentStage.pjId)?.name : '—'
            const isOverdue = currentStage?.deadline &&
                new Date(currentStage.deadline) < new Date() &&
                currentStage.status !== 'done' && currentStage.status !== 'archived'

            return {
                id: p.id,
                title: p.title,
                category: p.categoryLabel || p.category,
                type: p.typeLabel || p.type,
                currentStage: currentStage?.label || '—',
                progress: `${doneStages}/${totalStages}`,
                currentPJ,
                status: STATUS_LABELS[currentStage?.status] || 'Draft',
                deadline: currentStage?.deadline ? new Date(currentStage.deadline).toLocaleDateString('id-ID') : '—',
                overdue: isOverdue ? 'Ya' : 'Tidak',
                createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('id-ID') : '—'
            }
        })
    }, [filteredProjects])

    // Performance data per PJ
    const performanceData = useMemo(() => {
        return TEAM.filter(m => !m.isAdmin).map(member => {
            let totalAssigned = 0
            let totalDone = 0
            let totalRevisions = 0
            let totalActive = 0
            let totalOverdue = 0
            const projectNames = new Set()

            filteredProjects.forEach(project => {
                project.stages?.forEach(stage => {
                    if (stage.pjId === member.id) {
                        totalAssigned++
                        projectNames.add(project.title)
                        if (stage.status === 'done' || stage.status === 'archived') totalDone++
                        if (stage.status === 'active') totalActive++
                        if (stage.status === 'revision') totalRevisions++
                        if (stage.deadline && new Date(stage.deadline) < new Date() &&
                            stage.status !== 'done' && stage.status !== 'archived') {
                            totalOverdue++
                        }
                    }
                })
            })

            const completionRate = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0

            return {
                name: member.name,
                role: member.role,
                skills: member.skills.join(', '),
                totalProjects: projectNames.size,
                totalAssigned,
                totalDone,
                totalActive,
                totalRevisions,
                totalOverdue,
                completionRate: `${completionRate}%`
            }
        }).sort((a, b) => b.totalDone - a.totalDone)
    }, [filteredProjects])

    // Export to XLS
    const exportXLS = () => {
        const wb = XLSX.utils.book_new()

        if (activeTab === 'projects') {
            const headers = ['ID Proyek', 'Judul', 'Kategori', 'Tipe', 'Tahap Saat Ini', 'Progres', 'PJ', 'Status', 'Deadline', 'Terlambat', 'Dibuat']
            const rows = projectReportData.map(r => [
                r.id, r.title, r.category, r.type, r.currentStage, r.progress, r.currentPJ, r.status, r.deadline, r.overdue, r.createdAt
            ])
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

            // Column widths
            ws['!cols'] = [
                { wch: 16 }, { wch: 35 }, { wch: 14 }, { wch: 18 },
                { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 20 },
                { wch: 14 }, { wch: 10 }, { wch: 14 }
            ]
            XLSX.utils.book_append_sheet(wb, ws, 'Laporan Proyek')
        } else {
            const headers = ['Nama', 'Jabatan', 'Keahlian', 'Jumlah Proyek', 'Tahap Ditugaskan', 'Selesai', 'Aktif', 'Revisi', 'Terlambat', 'Tingkat Penyelesaian']
            const rows = performanceData.map(r => [
                r.name, r.role, r.skills, r.totalProjects, r.totalAssigned, r.totalDone, r.totalActive, r.totalRevisions, r.totalOverdue, r.completionRate
            ])
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
            ws['!cols'] = [
                { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 14 },
                { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
                { wch: 10 }, { wch: 20 }
            ]
            XLSX.utils.book_append_sheet(wb, ws, 'Performa PJ')
        }

        const filename = activeTab === 'projects'
            ? `Laporan_Proyek_${new Date().toISOString().slice(0, 10)}.xlsx`
            : `Performa_PJ_${new Date().toISOString().slice(0, 10)}.xlsx`

        XLSX.writeFile(wb, filename)
    }

    // Export to PDF
    const exportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

        // Title
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(
            activeTab === 'projects' ? 'Laporan Proyek Penerbitan' : 'Laporan Performa Penanggung Jawab',
            14, 15
        )

        // Subtitle with filters
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        const filterTexts = []
        if (dateFrom || dateTo) filterTexts.push(`Periode: ${dateFrom || '...'} s/d ${dateTo || '...'}`)
        if (filterCat) filterTexts.push(`Kategori: ${CATEGORIES[filterCat]?.label || filterCat}`)
        if (filterType) {
            const typeLabel = CATEGORIES[filterCat]?.types?.find(t => t.id === filterType)?.label || filterType
            filterTexts.push(`Tipe: ${typeLabel}`)
        }
        if (filterPJ) filterTexts.push(`PJ: ${TEAM.find(m => m.id === filterPJ)?.name || filterPJ}`)
        if (filterTexts.length === 0) filterTexts.push('Semua data')
        doc.text(filterTexts.join(' | '), 14, 21)
        doc.text(`Digenerate: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 26)
        doc.setTextColor(0)

        if (activeTab === 'projects') {
            autoTable(doc, {
                startY: 32,
                head: [['ID', 'Judul', 'Kategori', 'Tipe', 'Tahap', 'Progres', 'PJ', 'Status', 'Deadline', 'Terlambat']],
                body: projectReportData.map(r => [
                    r.id, r.title, r.category, r.type, r.currentStage, r.progress, r.currentPJ, r.status, r.deadline, r.overdue
                ]),
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 7, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                columnStyles: {
                    0: { cellWidth: 24 },
                    1: { cellWidth: 45 },
                    4: { cellWidth: 38 },
                    9: { halign: 'center' }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 9 && data.cell.raw === 'Ya') {
                        data.cell.styles.textColor = [220, 38, 38]
                        data.cell.styles.fontStyle = 'bold'
                    }
                }
            })
        } else {
            autoTable(doc, {
                startY: 32,
                head: [['Nama', 'Keahlian', 'Proyek', 'Ditugaskan', 'Selesai', 'Aktif', 'Revisi', 'Terlambat', 'Tingkat Penyelesaian']],
                body: performanceData.map(r => [
                    r.name, r.skills, r.totalProjects, r.totalAssigned, r.totalDone, r.totalActive, r.totalRevisions, r.totalOverdue, r.completionRate
                ]),
                styles: { fontSize: 8, cellPadding: 2.5 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                columnStyles: {
                    1: { cellWidth: 60 },
                    8: { halign: 'center', fontStyle: 'bold' }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 7 && Number(data.cell.raw) > 0) {
                        data.cell.styles.textColor = [220, 38, 38]
                        data.cell.styles.fontStyle = 'bold'
                    }
                }
            })
        }

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(7)
            doc.setTextColor(150)
            doc.text(`Sistem Manajemen Penerbitan — Halaman ${i}/${pageCount}`, 14, doc.internal.pageSize.height - 8)
        }

        const filename = activeTab === 'projects'
            ? `Laporan_Proyek_${new Date().toISOString().slice(0, 10)}.pdf`
            : `Performa_PJ_${new Date().toISOString().slice(0, 10)}.pdf`

        doc.save(filename)
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>📊 Laporan & Ekspor</h1>
                    <p>Tarik data proyek dan performa PJ</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-success" onClick={exportXLS}>
                        <HiOutlineTableCells /> Ekspor XLS
                    </button>
                    <button className="btn btn-danger" onClick={exportPDF}>
                        <HiOutlineDocumentText /> Ekspor PDF
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-title" style={{ marginBottom: '0.75rem' }}>🔍 Filter Data</div>
                <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Dari Tanggal</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Sampai Tanggal</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Kategori</label>
                        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setFilterType('') }}>
                            <option value="">Semua</option>
                            <option value="terbitan">Terbitan</option>
                            <option value="medsos">Media Sosial</option>
                            <option value="keuangan">Keuangan</option>
                            <option value="lainnya">Lainnya</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Tipe Proyek</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} disabled={!filterCat || filterCat === 'lainnya'}>
                            <option value="">Semua</option>
                            {typeOptions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Penanggung Jawab</label>
                        <select value={filterPJ} onChange={e => setFilterPJ(e.target.value)}>
                            <option value="">Semua</option>
                            {TEAM.filter(m => !m.isAdmin).map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {(dateFrom || dateTo || filterCat || filterType || filterPJ) && (
                    <div style={{ marginTop: '0.75rem' }}>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setDateFrom(''); setDateTo(''); setFilterCat(''); setFilterType(''); setFilterPJ('') }}
                        >
                            ✕ Reset Filter
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
                    📁 Laporan Proyek ({projectReportData.length})
                </button>
                <button className={`tab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
                    👤 Performa PJ ({performanceData.length})
                </button>
            </div>

            {/* Project Report Table */}
            {activeTab === 'projects' && (
                <div className="card">
                    {projectReportData.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📁</div>
                            <h3>Tidak ada data</h3>
                            <p>Tidak ada proyek yang sesuai dengan filter Anda.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID Proyek</th>
                                        <th>Judul</th>
                                        <th>Kategori</th>
                                        <th>Tipe</th>
                                        <th>Tahap Saat Ini</th>
                                        <th>Progres</th>
                                        <th>PJ</th>
                                        <th>Status</th>
                                        <th>Deadline</th>
                                        <th>Terlambat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectReportData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.id}</td>
                                            <td><strong>{row.title}</strong></td>
                                            <td><span className="badge badge-draft">{row.category}</span></td>
                                            <td style={{ fontSize: '0.75rem' }}>{row.type}</td>
                                            <td style={{ fontSize: '0.75rem' }}>{row.currentStage}</td>
                                            <td style={{ fontWeight: 600 }}>{row.progress}</td>
                                            <td>{row.currentPJ}</td>
                                            <td>
                                                <span className={`badge ${row.status === 'Sedang Berjalan' ? 'badge-active' :
                                                        row.status === 'Menunggu Konfirmasi' ? 'badge-review' :
                                                            row.status === 'Direvisi' ? 'badge-revision' :
                                                                row.status === 'Selesai' ? 'badge-done' :
                                                                    'badge-draft'
                                                    }`}>{row.status}</span>
                                            </td>
                                            <td style={{ fontSize: '0.75rem' }}>{row.deadline}</td>
                                            <td style={{
                                                color: row.overdue === 'Ya' ? 'var(--danger)' : 'var(--success)',
                                                fontWeight: row.overdue === 'Ya' ? 700 : 400,
                                                fontSize: '0.75rem'
                                            }}>
                                                {row.overdue === 'Ya' ? '⚠️ Ya' : '✓'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Summary */}
                    {projectReportData.length > 0 && (
                        <div style={{
                            display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
                            padding: '1rem 0 0', marginTop: '1rem',
                            borderTop: '1px solid var(--border)', fontSize: '0.8rem'
                        }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Total Proyek:</span>{' '}
                                <strong>{projectReportData.length}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Terlambat:</span>{' '}
                                <strong style={{ color: 'var(--danger)' }}>
                                    {projectReportData.filter(r => r.overdue === 'Ya').length}
                                </strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Menunggu Review:</span>{' '}
                                <strong style={{ color: 'var(--warning)' }}>
                                    {projectReportData.filter(r => r.status === 'Menunggu Konfirmasi').length}
                                </strong>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Performance Report Table */}
            {activeTab === 'performance' && (
                <div className="card">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nama</th>
                                    <th>Keahlian</th>
                                    <th>Proyek</th>
                                    <th>Ditugaskan</th>
                                    <th>Selesai</th>
                                    <th>Aktif</th>
                                    <th>Revisi</th>
                                    <th>Terlambat</th>
                                    <th>Tingkat Penyelesaian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performanceData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <div className={`leaderboard-rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default'}`}>
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td><strong>{row.name}</strong></td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.skills}</td>
                                        <td style={{ textAlign: 'center' }}>{row.totalProjects}</td>
                                        <td style={{ textAlign: 'center' }}>{row.totalAssigned}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700 }}>{row.totalDone}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>{row.totalActive}</td>
                                        <td style={{ textAlign: 'center', color: row.totalRevisions > 0 ? 'var(--warning)' : 'inherit' }}>
                                            {row.totalRevisions}
                                        </td>
                                        <td style={{
                                            textAlign: 'center',
                                            color: row.totalOverdue > 0 ? 'var(--danger)' : 'inherit',
                                            fontWeight: row.totalOverdue > 0 ? 700 : 400
                                        }}>
                                            {row.totalOverdue > 0 ? `⚠️ ${row.totalOverdue}` : '0'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div className="leaderboard-bar" style={{ flex: 1 }}>
                                                    <div
                                                        className="leaderboard-bar-fill"
                                                        style={{ width: row.completionRate }}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '35px' }}>
                                                    {row.completionRate}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Performance Summary */}
                    <div style={{
                        display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
                        padding: '1rem 0 0', marginTop: '1rem',
                        borderTop: '1px solid var(--border)', fontSize: '0.8rem'
                    }}>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Total Personil:</span>{' '}
                            <strong>{performanceData.length}</strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Total Tahap Selesai:</span>{' '}
                            <strong style={{ color: 'var(--success)' }}>
                                {performanceData.reduce((s, r) => s + r.totalDone, 0)}
                            </strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Rata-rata Penyelesaian:</span>{' '}
                            <strong>
                                {performanceData.length > 0
                                    ? Math.round(performanceData.reduce((s, r) => s + parseInt(r.completionRate), 0) / performanceData.length)
                                    : 0}%
                            </strong>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
