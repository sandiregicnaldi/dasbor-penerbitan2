import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TEAM, getEligiblePJ } from '../data/team'
import { CATEGORIES, STATUS_LABELS } from '../data/categories'

export default function ProjectDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { projects, updateProject, updateStage, addNotification, isAdmin, currentUser } = useApp()

    const project = projects.find(p => p.id === id)
    const [selectedStageIdx, setSelectedStageIdx] = useState(null)
    const [noteText, setNoteText] = useState('')
    const [resultLink, setResultLink] = useState('')

    // QC modal states
    const [showQcModal, setShowQcModal] = useState(false)
    const [qcAction, setQcAction] = useState('') // 'approve' or 'revise'
    const [revisionNote, setRevisionNote] = useState('')

    // Next stage assignment
    const [nextStageIdx, setNextStageIdx] = useState('')
    const [nextPjId, setNextPjId] = useState('')
    const [nextDeadline, setNextDeadline] = useState('')

    // Assign pending stage modal
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assignStageIdx, setAssignStageIdx] = useState(null)
    const [assignPjId, setAssignPjId] = useState('')
    const [assignDeadline, setAssignDeadline] = useState('')

    // Archive confirm
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [archiveStageIdx, setArchiveStageIdx] = useState(null)

    if (!project) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>Proyek tidak ditemukan</h3>
                    <p>Proyek dengan ID "{id}" tidak ada.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/projects')}>Kembali</button>
                </div>
            </div>
        )
    }

    const stages = project.stages || []
    const activeStageIdx = selectedStageIdx !== null ? selectedStageIdx :
        stages.findIndex(s => s.status === 'active' || s.status === 'review' || s.status === 'revision')
    const activeStage = activeStageIdx >= 0 ? stages[activeStageIdx] : stages[0]
    const pj = activeStage?.pjId ? TEAM.find(m => m.id === activeStage.pjId) : null
    const isMyStage = currentUser?.id === activeStage?.pjId
    const catObj = CATEGORIES[project.category]

    const isOverdue = (stage) => {
        if (!stage?.deadline || stage.status === 'done' || stage.status === 'archived') return false
        return new Date(stage.deadline) < new Date()
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    const getDeadlineCountdown = (deadline) => {
        if (!deadline) return null
        const now = new Date()
        const dl = new Date(deadline)
        const diff = Math.ceil((dl - now) / (1000 * 60 * 60 * 24))
        if (diff < 0) return { text: `${Math.abs(diff)} hari terlambat`, overdue: true }
        if (diff === 0) return { text: 'Hari ini', overdue: false }
        return { text: `${diff} hari lagi`, overdue: false }
    }

    const getStatusBadge = (status) => {
        const map = {
            draft: 'badge-draft', active: 'badge-active', review: 'badge-review',
            revision: 'badge-revision', done: 'badge-done', archived: 'badge-archived'
        }
        return map[status] || 'badge-draft'
    }

    // PJ: Update progress
    const handleProgress = (progress) => {
        if (!isMyStage && !isAdmin) return
        const newStatus = progress > 0 ? 'active' : 'draft'
        updateStage(project.id, activeStage.id, { progress, status: newStatus })
    }

    // PJ: Mark complete
    const handleComplete = () => {
        if (!resultLink && !activeStage.resultLink) {
            alert('Wajib mengisi Link Hasil Kerja sebelum menandai selesai!')
            return
        }
        updateStage(project.id, activeStage.id, {
            resultLink: resultLink || activeStage.resultLink,
            status: 'active',
            progress: 100
        })
    }

    // PJ: Submit for review
    const handleSubmitReview = () => {
        if (activeStage.progress < 100) {
            alert('Progres harus 100% sebelum mengajukan review!')
            return
        }
        updateStage(project.id, activeStage.id, { status: 'review' })
        addNotification({
            type: 'review',
            title: 'Ajukan Review',
            message: `${currentUser.name} mengajukan review untuk tahap "${activeStage.label}" di proyek "${project.title}".`,
            projectId: project.id
        })
    }

    // Admin: QC Approve
    const handleApprove = () => {
        updateStage(project.id, activeStage.id, { status: 'done' })

        // If next stage selected, activate it
        if (nextStageIdx !== '' && stages[parseInt(nextStageIdx)]) {
            const nextStage = stages[parseInt(nextStageIdx)]
            const pjId = project.singlePJ ? activeStage.pjId : nextPjId
            updateStage(project.id, nextStage.id, {
                status: 'draft',
                pjId: pjId,
                deadline: nextDeadline
            })
        }

        addNotification({
            type: 'approved',
            title: 'Tahap Disetujui',
            message: `Tantawi menyetujui tahap "${activeStage.label}" di proyek "${project.title}".`,
            projectId: project.id
        })

        setShowQcModal(false)
        setNextStageIdx('')
        setNextPjId('')
        setNextDeadline('')
    }

    // Admin: QC Revise
    const handleRevise = () => {
        if (!revisionNote.trim()) {
            alert('Wajib mengisi catatan revisi!')
            return
        }
        updateStage(project.id, activeStage.id, {
            status: 'revision',
            progress: 25,
            notes: [...(activeStage.notes || []), {
                from: 'Tantawi',
                text: `[REVISI] ${revisionNote}`,
                time: new Date().toISOString()
            }]
        })
        addNotification({
            type: 'revision',
            title: 'Direvisi',
            message: `Tantawi meminta revisi pada tahap "${activeStage.label}": ${revisionNote}`,
            projectId: project.id
        })
        setShowQcModal(false)
        setRevisionNote('')
    }

    // Send note
    const handleSendNote = () => {
        if (!noteText.trim()) return
        const updatedNotes = [...(activeStage.notes || []), {
            from: currentUser.name,
            text: noteText,
            time: new Date().toISOString()
        }]
        updateStage(project.id, activeStage.id, { notes: updatedNotes })
        setNoteText('')
    }

    // Admin: assign pending stage
    const handleAssignStage = () => {
        if (!assignPjId) return
        const stage = stages[assignStageIdx]
        updateStage(project.id, stage.id, {
            pjId: assignPjId,
            deadline: assignDeadline
        })
        setShowAssignModal(false)
        setAssignPjId('')
        setAssignDeadline('')
    }

    // Archive stage
    const handleArchive = () => {
        const stage = stages[archiveStageIdx]
        updateStage(project.id, stage.id, { status: 'archived' })
        setShowArchiveConfirm(false)
    }

    // Pending stages for next selection
    const pendingStages = stages
        .map((s, idx) => ({ ...s, idx }))
        .filter(s => s.status === 'draft' && s.idx !== activeStageIdx)

    return (
        <div>
            {/* Project Header */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: '0.5rem' }}>
                            ← Kembali ke Proyek
                        </button>
                        <h1 style={{ fontSize: '1.375rem', fontWeight: 800 }}>
                            {project.categoryIcon} {project.title}
                        </h1>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.375rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span style={{ fontFamily: 'monospace' }}>{project.id}</span>
                            <span>•</span>
                            <span>{project.categoryLabel} — {project.typeLabel}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {project.gdriveLink && (
                            <a href={project.gdriveLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                📂 Folder GDrive
                            </a>
                        )}
                        {catObj?.knowledgeBase && (
                            <a href={catObj.knowledgeBase} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                📘 Pedoman Kerja
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Grid: Pipeline + Active Stage */}
            <div className="detail-grid">
                {/* Left: Pipeline */}
                <div className="card">
                    <div className="card-title" style={{ marginBottom: '0.75rem' }}>Pipeline Tahapan</div>
                    <div className="pipeline">
                        {stages.map((stage, idx) => {
                            const stagePJ = stage.pjId ? TEAM.find(m => m.id === stage.pjId) : null
                            const overdue = isOverdue(stage)

                            return (
                                <div
                                    key={stage.id}
                                    className="pipeline-stage"
                                    onClick={() => setSelectedStageIdx(idx)}
                                    style={{
                                        background: idx === (selectedStageIdx !== null ? selectedStageIdx : activeStageIdx) ? 'var(--surface-hover)' : undefined,
                                        borderRadius: 'var(--radius)',
                                        paddingLeft: '0.5rem',
                                        paddingRight: '0.5rem'
                                    }}
                                >
                                    <div className={`stage-dot ${stage.status === 'archived' ? 'done' : stage.status}`}>
                                        {stage.status === 'done' || stage.status === 'archived' ? '✓' : idx + 1}
                                    </div>
                                    <div className="stage-info">
                                        <div className="stage-name" style={{ color: overdue ? 'var(--danger)' : undefined }}>
                                            {overdue && '⚠️ '}{stage.label}
                                        </div>
                                        <div className="stage-meta">
                                            {stagePJ ? `PJ: ${stagePJ.name}` : 'Belum ditugaskan'}
                                            {stage.deadline ? ` • ${formatDate(stage.deadline)}` : ''}
                                        </div>
                                        {/* Admin: click to assign pending stages */}
                                        {isAdmin && stage.status === 'draft' && !stage.pjId && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setAssignStageIdx(idx)
                                                    setShowAssignModal(true)
                                                }}
                                            >
                                                + Assign PJ & Deadline
                                            </button>
                                        )}
                                        {/* Archive button for done stages */}
                                        {isAdmin && stage.status === 'done' && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--success)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setArchiveStageIdx(idx)
                                                    setShowArchiveConfirm(true)
                                                }}
                                            >
                                                📦 Arsipkan
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right: Active Stage Detail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {activeStage && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div className="card-title">{activeStage.label}</div>
                                    <div className="card-subtitle">Tahap {(selectedStageIdx !== null ? selectedStageIdx : activeStageIdx) + 1} dari {stages.length}</div>
                                </div>
                                <span className={`badge ${getStatusBadge(activeStage.status)}`}>
                                    {STATUS_LABELS[activeStage.status] || 'Draft'}
                                </span>
                            </div>

                            {/* PJ Info */}
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>PENANGGUNG JAWAB</div>
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
                                        {pj ? (
                                            <>
                                                <div className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.6rem' }}>{pj.avatar}</div>
                                                {pj.name}
                                            </>
                                        ) : '—'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>DEADLINE</div>
                                    <div style={{
                                        fontWeight: 600, marginTop: '0.125rem',
                                        color: isOverdue(activeStage) ? 'var(--danger)' : 'var(--text)'
                                    }}>
                                        {formatDate(activeStage.deadline)}
                                        {activeStage.deadline && (() => {
                                            const cd = getDeadlineCountdown(activeStage.deadline)
                                            if (!cd) return null
                                            return <span style={{ fontSize: '0.7rem', marginLeft: '0.375rem', color: cd.overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                                                ({cd.text})
                                            </span>
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Progress */}
                            {activeStage.status !== 'done' && activeStage.status !== 'archived' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.375rem' }}>PROGRES</div>
                                    <div className="progress-steps">
                                        {[0, 25, 50, 75, 100].map(val => (
                                            <button
                                                key={val}
                                                className={`progress-step ${activeStage.progress >= val ? 'filled' : ''} ${activeStage.progress === val ? 'current' : ''}`}
                                                onClick={() => (isMyStage || isAdmin) && handleProgress(val)}
                                                disabled={!isMyStage && !isAdmin}
                                            >
                                                {val}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Link Hasil Kerja */}
                            {activeStage.status !== 'done' && activeStage.status !== 'archived' && (isMyStage || isAdmin) && (
                                <div className="form-group">
                                    <label className="form-label">Link Hasil Kerja</label>
                                    <div className="input-with-icon">
                                        <input
                                            type="url"
                                            value={resultLink || activeStage.resultLink || ''}
                                            onChange={e => setResultLink(e.target.value)}
                                            placeholder="https://docs.google.com/..."
                                        />
                                        {(resultLink || activeStage.resultLink) && (
                                            <span className={`input-icon ${(() => {
                                                try { new URL(resultLink || activeStage.resultLink); return 'valid' } catch { return 'invalid' }
                                            })()}`}>
                                                {(() => { try { new URL(resultLink || activeStage.resultLink); return '✓' } catch { return '✗' } })()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Display result link for completed stages */}
                            {(activeStage.status === 'done' || activeStage.status === 'archived') && activeStage.resultLink && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>HASIL KERJA</div>
                                    <a href={activeStage.resultLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                                        {activeStage.resultLink} ↗
                                    </a>
                                </div>
                            )}

                            {/* PJ Actions */}
                            {isMyStage && activeStage.status !== 'done' && activeStage.status !== 'archived' && activeStage.status !== 'review' && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button className="btn btn-success btn-sm" onClick={handleComplete}>
                                        ✅ Tandai Selesai
                                    </button>
                                    {activeStage.progress >= 100 && (
                                        <button className="btn btn-warning btn-sm" onClick={handleSubmitReview}>
                                            📤 Ajukan Review
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* PJ: Submit review if progress is 100 and status is active */}
                            {isMyStage && activeStage.status === 'active' && activeStage.progress >= 100 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <button className="btn btn-warning" onClick={handleSubmitReview}>
                                        📤 Ajukan Review ke Admin
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* QC Panel - Admin Only */}
                    {isAdmin && activeStage && (activeStage.status === 'review' || activeStage.status === 'done') && (
                        <div className="card" style={{ borderColor: 'var(--primary)' }}>
                            <div className="card-title" style={{ marginBottom: '0.75rem' }}>🔍 Panel QC (Admin)</div>

                            {activeStage.status === 'review' && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-success" onClick={() => { setQcAction('approve'); setShowQcModal(true) }}>
                                        ✅ Setuju
                                    </button>
                                    <button className="btn btn-danger" onClick={() => { setQcAction('revise'); setShowQcModal(true) }}>
                                        🔄 Revisi
                                    </button>
                                </div>
                            )}

                            {activeStage.status === 'done' && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                                    ✅ Tahap ini telah disetujui
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes / Discussion */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '0.75rem' }}>💬 Catatan & Diskusi</div>

                        <div className="chat-messages">
                            {(!activeStage?.notes || activeStage.notes.length === 0) ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem' }}>
                                    Belum ada catatan
                                </div>
                            ) : (
                                activeStage.notes.map((note, idx) => (
                                    <div key={idx} className={`chat-bubble ${note.from === currentUser.name ? 'sent' : 'received'}`}>
                                        <div className="chat-sender">{note.from}</div>
                                        <div>{note.text}</div>
                                        <div className="chat-time">
                                            {new Date(note.time).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="chat-input">
                            <input
                                type="text"
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Tulis catatan..."
                                onKeyDown={e => e.key === 'Enter' && handleSendNote()}
                            />
                            <button className="btn btn-primary btn-sm" onClick={handleSendNote}>
                                Kirim
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* QC Modal */}
            {showQcModal && (
                <div className="modal-overlay" onClick={() => setShowQcModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{qcAction === 'approve' ? '✅ Setuju & Lanjut' : '🔄 Permintaan Revisi'}</h2>
                            <button className="modal-close" onClick={() => setShowQcModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {qcAction === 'approve' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Tahap Berikutnya</label>
                                        <select value={nextStageIdx} onChange={e => setNextStageIdx(e.target.value)}>
                                            <option value="">— Tidak ada (selesai semua) —</option>
                                            {pendingStages.map(s => (
                                                <option key={s.idx} value={s.idx}>
                                                    {s.idx + 1}. {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {nextStageIdx !== '' && !project.singlePJ && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label">PJ Tahap Berikutnya</label>
                                                <select value={nextPjId} onChange={e => setNextPjId(e.target.value)}>
                                                    <option value="">Pilih PJ</option>
                                                    {(() => {
                                                        const stg = stages[parseInt(nextStageIdx)]
                                                        return stg ? getEligiblePJ(stg.label).map(m => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        )) : null
                                                    })()}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Deadline</label>
                                                <input type="date" value={nextDeadline} onChange={e => setNextDeadline(e.target.value)} />
                                            </div>
                                        </>
                                    )}
                                    {nextStageIdx !== '' && project.singlePJ && (
                                        <div className="form-group">
                                            <label className="form-label">Deadline</label>
                                            <input type="date" value={nextDeadline} onChange={e => setNextDeadline(e.target.value)} />
                                            <div className="form-hint">PJ tetap: {TEAM.find(m => m.id === activeStage.pjId)?.name || '—'}</div>
                                        </div>
                                    )}
                                </>
                            )}
                            {qcAction === 'revise' && (
                                <div className="form-group">
                                    <label className="form-label">Catatan Revisi *</label>
                                    <textarea
                                        rows={4}
                                        value={revisionNote}
                                        onChange={e => setRevisionNote(e.target.value)}
                                        placeholder="Jelaskan apa yang harus direvisi..."
                                        required
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowQcModal(false)}>Batal</button>
                            {qcAction === 'approve' ? (
                                <button className="btn btn-success" onClick={handleApprove}>✅ Setujui</button>
                            ) : (
                                <button className="btn btn-danger" onClick={handleRevise}>🔄 Kirim Revisi</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Stage Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign PJ & Deadline</h2>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Tahap: <strong>{stages[assignStageIdx]?.label}</strong>
                            </p>
                            <div className="form-group">
                                <label className="form-label">Penanggung Jawab</label>
                                <select value={assignPjId} onChange={e => setAssignPjId(e.target.value)}>
                                    <option value="">Pilih PJ</option>
                                    {getEligiblePJ(stages[assignStageIdx]?.label || '').map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.skills.join(', ')})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Deadline</label>
                                <input type="date" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Batal</button>
                            <button className="btn btn-primary" onClick={handleAssignStage}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Confirm Modal */}
            {showArchiveConfirm && (
                <div className="modal-overlay" onClick={() => setShowArchiveConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📦 Arsipkan Tahap</h2>
                            <button className="modal-close" onClick={() => setShowArchiveConfirm(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <p>Apakah Anda yakin ingin mengarsipkan tahap <strong>"{stages[archiveStageIdx]?.label}"</strong>?</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Tahap yang diarsipkan akan masuk ke halaman Arsip.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowArchiveConfirm(false)}>Tidak</button>
                            <button className="btn btn-success" onClick={handleArchive}>Ya, Arsipkan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
