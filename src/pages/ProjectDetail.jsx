import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES, STATUS_LABELS } from '../data/categories'
import { api } from '../services/api'

export default function ProjectDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { projects, updateProject, deleteProject, updateStage, addStageNote, createStage, addNotification, isAdmin, currentUser } = useApp()

    const project = projects.find(p => p.id === id)
    const [selectedStageIdx, setSelectedStageIdx] = useState(null)
    const [noteText, setNoteText] = useState('')
    const [resultLink, setResultLink] = useState(null)
    const [localProgress, setLocalProgress] = useState(null)
    const [showReviewConfirm, setShowReviewConfirm] = useState(false)

    // QC modal states
    const [showQcModal, setShowQcModal] = useState(false)
    const [qcAction, setQcAction] = useState('') // 'approve' or 'revise'
    const [revisionNote, setRevisionNote] = useState('')

    // Next stage assignment
    const [nextStageIdx, setNextStageIdx] = useState('')
    const [nextPjId, setNextPjId] = useState('')
    const [nextDeadline, setNextDeadline] = useState('')
    // Add stage for lainnya
    const [newStageName, setNewStageName] = useState('')
    const [showAddStage, setShowAddStage] = useState(false)

    // Assign pending stage modal
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assignStageIdx, setAssignStageIdx] = useState(null)
    const [assignPjId, setAssignPjId] = useState('')
    const [assignDeadline, setAssignDeadline] = useState('')

    // API-driven PJ candidates
    const [candidates, setCandidates] = useState([])
    const [candidatesLoading, setCandidatesLoading] = useState(false)
    const [selectedConflict, setSelectedConflict] = useState(null)
    // For QC next stage candidates
    const [nextCandidates, setNextCandidates] = useState([])
    const [nextCandidatesLoading, setNextCandidatesLoading] = useState(false)
    const [nextSelectedConflict, setNextSelectedConflict] = useState(null)

    // Archive confirm
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

    // Delete project confirm
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
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
    const getCurrentStageIdx = (project) => {
        if (!project.stages || project.stages.length === 0) return 0
        const idx = project.stages.findIndex(s =>
            s.status !== 'done' && s.status !== 'archived'
        )
        return idx >= 0 ? idx : project.stages.length - 1
    }
    const activeStageIdx = selectedStageIdx !== null ? selectedStageIdx : getCurrentStageIdx(project)
    const activeStage = stages[activeStageIdx]
    // PJ lookup: use enriched pj relation from API, with fallback
    const pj = activeStage?.pjId ? (activeStage.pj ? { id: activeStage.pj.id, name: activeStage.pj.name, avatar: activeStage.pj.avatarInitials || activeStage.pj.name?.substring(0, 2).toUpperCase() } : { id: activeStage.pjId, name: activeStage.pj?.name || 'Tunggu Penugasan...', avatar: '??' }) : null
    const isMyStage = currentUser?.id === activeStage?.pjId || currentUser?.id === project.createdBy
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

    // PJ: Update progress (local state only — requires save)
    const handleProgress = (progress) => {
        if (!isMyStage) return // only PJ can change
        if (activeStage.status === 'review') return // locked
        setLocalProgress(progress)
    }

    // PJ: Save progress to backend
    const handleSaveProgress = () => {
        if (localProgress === null) return
        const newStatus = localProgress > 0 ? 'active' : 'draft'
        updateStage(activeStage.id, { progress: localProgress, status: newStatus })
        setLocalProgress(null)
    }

    // PJ: Submit for review (with confirmation)
    const handleSubmitReview = () => {
        if (!resultLink && !activeStage.resultLink) {
            alert('Wajib mengisi Link Hasil Kerja sebelum mengajukan review!')
            return
        }
        updateStage(activeStage.id, {
            status: 'review',
            progress: 100,
            resultLink: resultLink || activeStage.resultLink
        })
        addNotification({
            type: 'review',
            title: 'Ajukan Review',
            message: `${currentUser.name} mengajukan review untuk tahap "${activeStage.label}" di proyek "${project.title}".`,
            projectId: project.id
        })
        setShowReviewConfirm(false)
        setLocalProgress(null)
    }

    // Admin: QC Approve
    const handleApprove = async () => {
        // 1. Mark current stage as done
        await updateStage(activeStage.id, { status: 'done' })

        // 2. Activate next stage
        if (nextStageIdx !== '' && stages[parseInt(nextStageIdx)]) {
            const targetIdx = parseInt(nextStageIdx)
            // Mark all intermediate stages as done (skipped)
            for (let i = activeStageIdx + 1; i < targetIdx; i++) {
                if (stages[i] && stages[i].status !== 'done' && stages[i].status !== 'archived') {
                    await updateStage(stages[i].id, { status: 'done', progress: 100 })
                }
            }
            // Activate the selected stage
            const nextStage = stages[targetIdx]
            const pjId = project.singlePJ ? activeStage.pjId : nextPjId
            await updateStage(nextStage.id, {
                status: 'active',
                pjId: pjId,
                deadline: nextDeadline
            })
        } else {
            // Auto-advance: find the next draft stage in order
            const nextDraft = stages.find((s, idx) => idx > activeStageIdx && s.status === 'draft')
            if (nextDraft) {
                const pjId = project.singlePJ ? activeStage.pjId : null
                await updateStage(nextDraft.id, {
                    status: 'active',
                    ...(pjId ? { pjId } : {})
                })
            }
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
    const handleRevise = async () => {
        if (!revisionNote.trim()) {
            alert('Wajib mengisi catatan revisi!')
            return
        }
        // First add the revision note via addNote API
        await addStageNote(activeStage.id, {
            from: currentUser.name,
            text: `[REVISI] ${revisionNote}`,
            time: new Date().toISOString()
        })
        // Then update status
        updateStage(activeStage.id, {
            status: 'revision',
            progress: 25
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

    // Save result link independently
    const handleSaveResultLink = async () => {
        if (!resultLink) return
        await updateStage(activeStage.id, { resultLink })
        setResultLink(null) // reset to null so saved link shows as clickable
    }

    // Send note via dedicated addNote API
    const handleSendNote = async () => {
        if (!noteText.trim()) return
        try {
            await addStageNote(activeStage.id, {
                from: currentUser.name,
                text: noteText,
                time: new Date().toISOString()
            })
            setNoteText('')
        } catch (e) {
            console.error('Failed to send note:', e)
            alert('Gagal mengirim catatan. Coba lagi.')
        }
    }

    // Fetch candidates from API for a stage
    const fetchCandidates = useCallback(async (stageId, setter, loadingSetter) => {
        loadingSetter(true)
        try {
            const data = await api.stages.getCandidates(stageId)
            setter(data.candidates || [])
        } catch (e) {
            console.error('Failed to fetch candidates:', e)
            setter([])
        } finally {
            loadingSetter(false)
        }
    }, [])

    // Open assign modal → fetch candidates
    const openAssignModal = (idx) => {
        setAssignStageIdx(idx)
        setAssignPjId('')
        setAssignDeadline('')
        setSelectedConflict(null)
        setCandidates([])
        setShowAssignModal(true)
        const stage = stages[idx]
        if (stage?.id) {
            fetchCandidates(stage.id, setCandidates, setCandidatesLoading)
        }
    }

    // Handle PJ selection in assign modal → show conflict if any
    const handleAssignPjSelect = (pjId) => {
        setAssignPjId(pjId)
        const candidate = candidates.find(c => c.id === pjId)
        setSelectedConflict(candidate?.conflict ? candidate : null)
    }

    // Handle PJ selection in QC next stage → show conflict if any  
    const handleNextPjSelect = (pjId) => {
        setNextPjId(pjId)
        const candidate = nextCandidates.find(c => c.id === pjId)
        setNextSelectedConflict(candidate?.conflict ? candidate : null)
    }

    // Admin: assign pending stage
    const handleAssignStage = () => {
        if (!assignPjId) return
        const stage = stages[assignStageIdx]
        updateStage(stage.id, {
            pjId: assignPjId,
            deadline: assignDeadline
        })
        setShowAssignModal(false)
        setAssignPjId('')
        setAssignDeadline('')
        setSelectedConflict(null)
    }

    // Archive stage
    const handleArchive = () => {
        const stage = stages[archiveStageIdx]
        updateStage(stage.id, { status: 'archived' })
        setShowArchiveConfirm(false)
    }

    // Delete project handler
    const handleDeleteProject = async () => {
        setIsDeleting(true)
        try {
            await deleteProject(project.id)
            navigate('/projects')
        } catch (e) {
            alert('Gagal menghapus proyek. Coba lagi.')
            setIsDeleting(false)
        }
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
                            <span>•</span>
                            <span>📅 Dibuat: {project.createdAt ? new Date(project.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                        {isAdmin && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setShowDeleteConfirm(true)}
                                title="Hapus proyek ini"
                            >
                                🗑️ Hapus Proyek
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Grid: Pipeline + Active Stage */}
            <div className="detail-grid">
                {/* Left: Pipeline */}
                <div className="card">
                    <div className="card-title" style={{ marginBottom: '0.75rem' }}>Timeline Tahapan</div>
                    <div className="pipeline">
                        {stages.map((stage, idx) => {
                            const stagePJ = stage.pj || null
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
                                            {stage.pj ? `PJ: ${stage.pj.name}` : (stage.pjId ? 'PJ: Personil Terpilih' : 'Belum ditugaskan')}
                                            {stage.deadline ? ` • ${formatDate(stage.deadline)}` : ''}
                                        </div>
                                        {/* Clickable result link */}
                                        {stage.resultLink && (
                                            <a
                                                href={stage.resultLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}
                                            >
                                                📂 Hasil Kerja ↗
                                            </a>
                                        )}
                                        {/* Admin: click to assign/reassign stages without PJ */}
                                        {isAdmin && !stage.pjId && stage.status !== 'done' && stage.status !== 'archived' && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    openAssignModal(idx)
                                                }}
                                            >
                                                + Assign PJ & Deadline
                                            </button>
                                        )}
                                        {/* Admin: reassign PJ on active stages */}
                                        {isAdmin && stage.pjId && stage.status !== 'done' && stage.status !== 'archived' && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--primary)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    openAssignModal(idx)
                                                }}
                                            >
                                                ✏️ Ubah PJ / Deadline
                                            </button>
                                        )}
                                        {/* Archive button — only on LAST stage when it's done */}
                                        {idx === stages.length - 1 && stage.status === 'done' && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--success)' }}
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    if (!window.confirm(`Arsipkan tahapan proyek "${project.title}"? Semua tahapan akan ditandai selesai.`)) return
                                                    // Archive all stages
                                                    for (const s of stages) {
                                                        if (s.status !== 'archived') {
                                                            await updateStage(s.id, { status: 'archived' })
                                                        }
                                                    }
                                                    navigate('/')
                                                }}
                                            >
                                                📦 Arsipkan Proyek
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Add stage button for lainnya */}
                    {isAdmin && project.category === 'lainnya' && (
                        <div style={{ marginTop: '0.75rem' }}>
                            {showAddStage ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={newStageName}
                                        onChange={e => setNewStageName(e.target.value)}
                                        placeholder="Nama tahapan baru..."
                                        style={{ flex: 1, fontSize: '0.8rem' }}
                                        autoFocus
                                    />
                                    <button
                                        className="btn btn-primary btn-sm"
                                        disabled={!newStageName.trim()}
                                        onClick={async () => {
                                            await createStage({
                                                projectId: project.id,
                                                label: newStageName.trim(),
                                                order: stages.length + 1
                                            })
                                            setNewStageName('')
                                            setShowAddStage(false)
                                        }}
                                    >
                                        ✓
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddStage(false); setNewStageName('') }}>✕</button>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ width: '100%' }}
                                    onClick={() => setShowAddStage(true)}
                                >
                                    ➕ Tambah Tahapan
                                </button>
                            )}
                        </div>
                    )}
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
                                    {isAdmin && !isMyStage ? (
                                        /* Admin: read-only progress display */
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${activeStage.progress || 0}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s' }} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '40px' }}>{activeStage.progress || 0}%</span>
                                            </div>
                                            {activeStage.status === 'review' && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                                                    🔒 Menunggu review admin
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* PJ: interactive progress buttons */
                                        <>
                                            <div className="progress-steps">
                                                {[0, 25, 50, 75, 100].map(val => {
                                                    const displayProgress = localProgress !== null ? localProgress : activeStage.progress
                                                    const isLocked = activeStage.status === 'review'
                                                    return (
                                                        <button
                                                            key={val}
                                                            className={`progress-step ${displayProgress >= val ? 'filled' : ''} ${displayProgress === val ? 'current' : ''}`}
                                                            onClick={() => handleProgress(val)}
                                                            disabled={!isMyStage || isLocked}
                                                        >
                                                            {val}%
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {/* Save Progress Button — only when changed AND not at 100% */}
                                            {localProgress !== null && localProgress !== activeStage.progress && localProgress !== 100 && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ marginTop: '0.5rem' }}
                                                    onClick={handleSaveProgress}
                                                >
                                                    💾 Simpan Progress
                                                </button>
                                            )}
                                            {/* Submit Review Button — only at 100%, replaces Simpan Progress */}
                                            {(localProgress === 100 || activeStage.progress === 100) && activeStage.status !== 'review' && isMyStage && (
                                                <button
                                                    className="btn btn-warning btn-sm"
                                                    style={{ marginTop: '0.5rem' }}
                                                    onClick={() => setShowReviewConfirm(true)}
                                                >
                                                    📤 Ajukan Review
                                                </button>
                                            )}
                                            {activeStage.status === 'review' && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                                                    🔒 Progress terkunci — sedang menunggu review admin
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Folder Pekerjaan: from previous stage's resultLink or project-level GDrive */}
                            {(() => {
                                const prevStage = stages.find(s => s.order === activeStage.order - 1)
                                const folderLink = prevStage?.resultLink || project.gdriveLink
                                if (!folderLink) return null
                                return (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>FOLDER PEKERJAAN</div>
                                        <a href={folderLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                                            📂 {prevStage?.resultLink ? `Hasil Tahap "${prevStage.label}"` : 'Folder GDrive'} ↗
                                        </a>
                                    </div>
                                )
                            })()}

                            {/* Link Hasil Kerja */}
                            {activeStage.status !== 'done' && activeStage.status !== 'archived' && (
                                <div className="form-group">
                                    <label className="form-label">Link Hasil Kerja</label>
                                    {isMyStage ? (
                                        /* PJ: editable input */
                                        <>
                                            <div className="input-with-icon">
                                                <input
                                                    type="url"
                                                    value={resultLink !== null ? resultLink : (activeStage.resultLink || '')}
                                                    onChange={e => setResultLink(e.target.value)}
                                                    placeholder="https://docs.google.com/..."
                                                />
                                                {(resultLink || activeStage.resultLink) && (
                                                    <span className={`input-icon ${(() => {
                                                        const val = resultLink !== null ? resultLink : activeStage.resultLink
                                                        try { new URL(val); return 'valid' } catch { return 'invalid' }
                                                    })()}`}>
                                                        {(() => { const val = resultLink !== null ? resultLink : activeStage.resultLink; try { new URL(val); return '✓' } catch { return '✗' } })()}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Save result link button */}
                                            {resultLink !== null && resultLink !== (activeStage.resultLink || '') && resultLink !== '' && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ marginTop: '0.5rem' }}
                                                    onClick={handleSaveResultLink}
                                                >
                                                    💾 Simpan Link
                                                </button>
                                            )}
                                            {/* Show saved link as clickable */}
                                            {activeStage.resultLink && (resultLink === null || resultLink === '' || resultLink === activeStage.resultLink) && (
                                                <a
                                                    href={activeStage.resultLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}
                                                >
                                                    🔗 Buka Hasil Kerja ↗
                                                </a>
                                            )}
                                        </>
                                    ) : (
                                        /* Admin: read-only clickable link */
                                        activeStage.resultLink ? (
                                            <a
                                                href={activeStage.resultLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--primary)' }}
                                            >
                                                🔗 {activeStage.resultLink} ↗
                                            </a>
                                        ) : (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada link hasil kerja</div>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Display result link for completed/archived stages (read-only) */}
                            {(activeStage.status === 'done' || activeStage.status === 'archived') && activeStage.resultLink && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>HASIL KERJA</div>
                                    <a href={activeStage.resultLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                                        🔗 {activeStage.resultLink} ↗
                                    </a>
                                </div>
                            )}

                            {/* Review Confirmation Modal */}
                            {showReviewConfirm && (
                                <div className="modal-overlay" onClick={() => setShowReviewConfirm(false)}>
                                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                                        <div className="modal-header">
                                            <div className="card-title">📤 Konfirmasi Review</div>
                                        </div>
                                        <div style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                            <p>Apakah Anda yakin mengajukan review untuk tahap <strong>"{activeStage.label}"</strong>?</p>
                                            <p style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.8rem' }}>⚠️ Progress tidak bisa diubah setelah review diajukan.</p>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0 1rem 1rem' }}>
                                            <button className="btn btn-ghost" onClick={() => setShowReviewConfirm(false)}>Batal</button>
                                            <button className="btn btn-warning" onClick={handleSubmitReview}>Ya, Ajukan Review</button>
                                        </div>
                                    </div>
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
                                        <select value={nextStageIdx} onChange={e => {
                                            setNextStageIdx(e.target.value)
                                            setNextPjId('')
                                            setNextSelectedConflict(null)
                                            // Fetch candidates for the selected next stage
                                            const stgIdx = parseInt(e.target.value)
                                            const stg = stages[stgIdx]
                                            if (stg?.id) {
                                                fetchCandidates(stg.id, setNextCandidates, setNextCandidatesLoading)
                                            } else {
                                                setNextCandidates([])
                                            }
                                        }}>
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
                                                {nextCandidatesLoading ? (
                                                    <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Memuat kandidat...</div>
                                                ) : (
                                                    <select value={nextPjId} onChange={e => handleNextPjSelect(e.target.value)}>
                                                        <option value="">Pilih PJ</option>
                                                        {nextCandidates.map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name}{c.conflict ? ' ⚠️' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            {nextSelectedConflict && (
                                                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: '#b45309', marginTop: '0.25rem' }}>
                                                    <strong>⚠️ Konflik:</strong> {nextSelectedConflict.name} sedang mengerjakan:
                                                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                                                        {nextSelectedConflict.conflictStages?.map((cs, i) => (
                                                            <li key={i}>{cs.stageLabel} — {cs.projectTitle}</li>
                                                        ))}
                                                    </ul>
                                                    <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>Anda tetap bisa assign (override).</div>
                                                </div>
                                            )}
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
                                            <div className="form-hint">PJ tetap: {activeStage.pj?.name || '—'}</div>
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
                                {candidatesLoading ? (
                                    <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Memuat kandidat berdasarkan skill...</div>
                                ) : candidates.length === 0 ? (
                                    <div style={{ padding: '0.5rem', color: 'var(--danger)', fontSize: '0.8rem' }}>Tidak ada kandidat dengan skill yang sesuai.</div>
                                ) : (
                                    <select value={assignPjId} onChange={e => handleAssignPjSelect(e.target.value)}>
                                        <option value="">Pilih PJ ({candidates.length} kandidat)</option>
                                        {candidates.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}{c.conflict ? ' ⚠️ Konflik' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {selectedConflict && (
                                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: '#b45309', marginBottom: '0.75rem' }}>
                                    <strong>⚠️ Peringatan Konflik:</strong> <strong>{selectedConflict.name}</strong> sedang mengerjakan tahap aktif di proyek lain:
                                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                                        {selectedConflict.conflictStages?.map((cs, i) => (
                                            <li key={i}>
                                                <strong>{cs.stageLabel}</strong> — {cs.projectTitle} <span className={`badge badge-${cs.status === 'active' ? 'active' : 'draft'}`} style={{ fontSize: '0.65rem' }}>{cs.status}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div style={{ marginTop: '0.35rem', fontStyle: 'italic', fontSize: '0.72rem' }}>Anda tetap bisa meng-assign (override). Klik "Simpan" untuk melanjutkan.</div>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Deadline</label>
                                <input type="date" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Batal</button>
                            <button className="btn btn-primary" onClick={handleAssignStage} disabled={!assignPjId}>
                                {selectedConflict ? '⚠️ Override & Simpan' : 'Simpan'}
                            </button>
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
            {/* Delete Project Confirm Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🗑️ Hapus Proyek</h2>
                            <button className="modal-close" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>✕</button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
                            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
                                Hapus proyek <strong>"{project.title}"</strong>?
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                ID: <code style={{ fontFamily: 'monospace' }}>{project.id}</code>
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.75rem', padding: '0.5rem', background: 'var(--danger-bg, rgba(239,68,68,0.08))', borderRadius: 'var(--radius)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                ⚠️ Tindakan ini <strong>tidak bisa dibatalkan</strong>. Semua tahap dan data dalam proyek ini akan dihapus permanen.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                                Batal
                            </button>
                            <button className="btn btn-danger" onClick={handleDeleteProject} disabled={isDeleting}>
                                {isDeleting ? 'Menghapus...' : '🗑️ Ya, Hapus Permanen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
