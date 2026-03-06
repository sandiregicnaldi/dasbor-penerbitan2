import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/categories'
import { api } from '../services/api'

export default function ProjectNew() {
    const { addProject } = useApp()
    const navigate = useNavigate()

    const [title, setTitle] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [category, setCategory] = useState('')
    const [projectType, setProjectType] = useState('')
    const [gdriveLink, setGdriveLink] = useState('')
    const [startFromStage, setStartFromStage] = useState(0)
    const [showKbPopup, setShowKbPopup] = useState(false)

    // For Lainnya: custom type and stages
    const [customType, setCustomType] = useState('')
    const [customStages, setCustomStages] = useState([{ id: 'custom-1', label: '' }])

    // Stage assignments (PJ, deadline)
    const [stageAssignments, setStageAssignments] = useState({})

    // API Candidates storage
    const [candidatesMap, setCandidatesMap] = useState({})
    const [loadingCandidates, setLoadingCandidates] = useState(false)

    const selectedCategory = category ? CATEGORIES[category] : null
    const types = selectedCategory?.types || []

    // Type-specific stage overrides (matches backend)
    const TYPE_STAGES = {
        terjemahan: [
            { id: 'terjemahkan', label: "Terjemahkan", order: 1 },
            { id: 'penyuntingan-terjemahan', label: "Penyuntingan Naskah Terjemahan", order: 2 },
        ],
    };

    const stages = TYPE_STAGES[projectType] || selectedCategory?.stages || []

    // Fetch candidates for current stages
    useEffect(() => {
        const fetchAllCandidates = async () => {
            if (!category) return;

            setLoadingCandidates(true);
            const newMap = { ...candidatesMap };
            let hasNew = false;

            const stagesToFetch = category === 'lainnya' ? customStages : stages;

            for (const stage of stagesToFetch) {
                if (stage.label && !newMap[stage.label]) {
                    try {
                        const result = await api.stages.getCandidatesByLabel(stage.label);
                        newMap[stage.label] = result.candidates;
                        hasNew = true;
                    } catch (err) {
                        console.error(`Failed to fetch candidates for ${stage.label}:`, err);
                    }
                }
            }

            if (hasNew) setCandidatesMap(newMap);
            setLoadingCandidates(false);
        };

        fetchAllCandidates();
    }, [category, projectType, customStages]);

    const handleCategoryChange = (e) => {
        const cat = e.target.value
        setCategory(cat)
        setProjectType('')
        setStartFromStage(0)
        setStageAssignments({})
    }

    const updateStageAssignment = (stageIdx, field, value) => {
        setStageAssignments(prev => ({
            ...prev,
            [stageIdx]: { ...prev[stageIdx], [field]: value }
        }))
    }

    const addCustomStage = () => {
        setCustomStages(prev => [...prev, { id: `custom-${prev.length + 1}`, label: '' }])
    }

    const removeCustomStage = (idx) => {
        setCustomStages(prev => prev.filter((_, i) => i !== idx))
    }

    const updateCustomStage = (idx, label) => {
        setCustomStages(prev => prev.map((s, i) => i === idx ? { ...s, label } : s))
    }

    const isValidUrl = (str) => {
        try {
            new URL(str)
            return true
        } catch {
            return false
        }
    }

    const handleKnowledgeBase = () => {
        if (!selectedCategory) return
        if (selectedCategory.knowledgeBase) {
            window.open(selectedCategory.knowledgeBase, '_blank')
        } else {
            setShowKbPopup(true)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        let projectStages
        if (category === 'lainnya') {
            projectStages = customStages.filter(s => s.label.trim()).map((s, idx) => ({
                id: s.id,
                label: s.label,
                order: idx + 1,
                status: 'draft',
                pjId: stageAssignments[idx]?.pjId || '',
                deadline: stageAssignments[idx]?.deadline || '',
                progress: 0,
                resultLink: '',
                notes: []
            }))
        } else {
            projectStages = stages.map((stage, idx) => {
                const isFirst = idx === startFromStage
                const assignment = stageAssignments[idx] || {}
                return {
                    ...stage,
                    status: idx < startFromStage ? 'done' : (isFirst ? 'draft' : 'draft'),
                    pjId: isFirst ? (assignment.pjId || '') : '',
                    deadline: isFirst ? (assignment.deadline || '') : '',
                    progress: idx < startFromStage ? 100 : 0,
                    resultLink: '',
                    notes: []
                }
            })
        }

        const catObj = CATEGORIES[category]
        const typeObj = category === 'lainnya' ? null : types.find(t => t.id === projectType)

        const newProject = {
            title,
            date,
            category,
            categoryLabel: catObj?.label || category,
            categoryIcon: catObj?.icon || '📋',
            type: category === 'lainnya' ? customType : projectType,
            typeLabel: category === 'lainnya' ? customType : (typeObj?.label || projectType),
            workflow: catObj?.workflow || 'parallel',
            singlePJ: catObj?.singlePJ || false,
            gdriveLink,
            stages: projectStages
        }

        addProject(newProject)
        navigate('/projects')
    }

    const firstStageIdx = startFromStage

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Buat Proyek Baru</h1>
                    <p>Isi detail proyek dan penugasan tahapan</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Informasi Proyek */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-title" style={{ marginBottom: '1rem' }}>📋 Informasi Proyek</div>

                    <div className="form-group">
                        <label className="form-label">Judul Proyek *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Masukkan judul proyek..."
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Tanggal *</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kategori *</label>
                            <select value={category} onChange={handleCategoryChange} required>
                                <option value="">Pilih Kategori</option>
                                <option value="terbitan">📖 Terbitan</option>
                                <option value="medsos">📱 Media Sosial</option>
                                <option value="keuangan">💰 Keuangan</option>
                                <option value="lainnya">📋 Lainnya</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tipe Proyek *</label>
                            {category === 'lainnya' ? (
                                <input
                                    type="text"
                                    value={customType}
                                    onChange={e => setCustomType(e.target.value)}
                                    placeholder="Ketik tipe proyek..."
                                    required
                                />
                            ) : (
                                <select
                                    value={projectType}
                                    onChange={e => {
                                        setProjectType(e.target.value)
                                        setStageAssignments({})
                                        setStartFromStage(0)
                                    }}
                                    required
                                    disabled={!category}
                                >
                                    <option value="">Pilih Tipe</option>
                                    {types.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Link Folder GDrive</label>
                        <div className="input-with-icon">
                            <input
                                type="url"
                                value={gdriveLink}
                                onChange={e => setGdriveLink(e.target.value)}
                                placeholder="https://drive.google.com/..."
                            />
                            {gdriveLink && (
                                <span className={`input-icon ${isValidUrl(gdriveLink) ? 'valid' : 'invalid'}`}>
                                    {isValidUrl(gdriveLink) ? '✓' : '✗'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Knowledge Base Banner */}
                    {category && (
                        <div className="kb-banner" onClick={handleKnowledgeBase} style={{ cursor: 'pointer' }}>
                            <span className="kb-icon">📘</span>
                            <span className="kb-text">
                                {selectedCategory?.knowledgeBase
                                    ? <>Pedoman Kerja {selectedCategory.label} tersedia — <a href={selectedCategory.knowledgeBase} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Buka Pedoman ↗</a></>
                                    : 'Belum ada pedoman kerja untuk kategori ini'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Tahapan & Penugasan */}
                {category && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-title" style={{ marginBottom: '1rem' }}>📊 Tahapan & Penugasan</div>

                        {category !== 'lainnya' && stages.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Mulai dari Tahap</label>
                                <select value={startFromStage} onChange={e => setStartFromStage(parseInt(e.target.value))}>
                                    {stages.map((stage, idx) => (
                                        <option key={stage.id} value={idx}>
                                            ① {stage.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="form-hint">Tahapan sebelumnya akan ditandai sebagai selesai</div>
                            </div>
                        )}

                        {/* Sequential stages */}
                        {category !== 'lainnya' && (
                            <div className="pipeline" style={{ marginTop: '1rem' }}>
                                {stages.map((stage, idx) => {
                                    const isSkipped = idx < startFromStage
                                    const isFirst = idx === startFromStage
                                    const isSinglePJ = selectedCategory?.singlePJ
                                    const showAssignment = isFirst || (isSinglePJ && idx === startFromStage)
                                    const eligiblePJ = candidatesMap[stage.label] || []

                                    return (
                                        <div key={stage.id} className="pipeline-stage" style={{ opacity: isSkipped ? 0.4 : 1 }}>
                                            <div className={`stage-dot ${isSkipped ? 'done' : isFirst ? 'active' : 'draft'}`}>
                                                {isSkipped ? '✓' : idx + 1}
                                            </div>
                                            <div className="stage-info" style={{ flex: 1 }}>
                                                <div className="stage-name">{stage.label}</div>
                                                {isSkipped && <div className="stage-meta">Dilewati (sudah selesai)</div>}

                                                {showAssignment && (
                                                    <div className="form-row" style={{ marginTop: '0.5rem' }}>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">PJ {isSinglePJ && idx === startFromStage ? '(untuk semua tahap)' : ''}</label>
                                                            <select
                                                                value={stageAssignments[idx]?.pjId || ''}
                                                                onChange={e => updateStageAssignment(idx, 'pjId', e.target.value)}
                                                            >
                                                                <option value="">Pilih PJ</option>
                                                                {eligiblePJ.map(m => (
                                                                    <option key={m.id} value={m.id}>
                                                                        {m.name}{m.conflict ? ' ⚠️' : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {stageAssignments[idx]?.pjId && eligiblePJ.find(p => p.id === stageAssignments[idx].pjId)?.conflict && (
                                                                <div className="form-hint" style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>
                                                                    Peringatan: Personil ini memiliki tugas aktif lain.
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Deadline</label>
                                                            <input
                                                                type="date"
                                                                value={stageAssignments[idx]?.deadline || ''}
                                                                onChange={e => updateStageAssignment(idx, 'deadline', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {!isFirst && !isSkipped && !isSinglePJ && (
                                                    <div className="stage-meta">Akan diisi saat estafet</div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Lainnya: custom stages */}
                        {category === 'lainnya' && (
                            <div>
                                {customStages.map((stage, idx) => {
                                    const eligiblePJ = candidatesMap[stage.label] || []
                                    return (
                                        <div key={stage.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
                                            <div style={{ flex: 1 }}>
                                                <label className="form-label">Tahap {idx + 1}</label>
                                                <input
                                                    type="text"
                                                    value={stage.label}
                                                    onChange={e => updateCustomStage(idx, e.target.value)}
                                                    placeholder={`Nama tahap ${idx + 1}...`}
                                                />
                                            </div>
                                            <div style={{ width: '200px' }}>
                                                <label className="form-label">PJ</label>
                                                <select
                                                    value={stageAssignments[idx]?.pjId || ''}
                                                    onChange={e => updateStageAssignment(idx, 'pjId', e.target.value)}
                                                >
                                                    <option value="">Pilih PJ</option>
                                                    {eligiblePJ.map(m => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.name}{m.conflict ? ' ⚠️' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {stageAssignments[idx]?.pjId && eligiblePJ.find(p => p.id === stageAssignments[idx].pjId)?.conflict && (
                                                    <div style={{ color: 'var(--danger)', fontSize: '0.7rem' }}>Beban tinggi ⚠️</div>
                                                )}
                                            </div>
                                            <div style={{ width: '160px' }}>
                                                <label className="form-label">Deadline</label>
                                                <input
                                                    type="date"
                                                    value={stageAssignments[idx]?.deadline || ''}
                                                    onChange={e => updateStageAssignment(idx, 'deadline', e.target.value)}
                                                />
                                            </div>
                                            {customStages.length > 1 && (
                                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeCustomStage(idx)} style={{ color: 'var(--danger)' }}>
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                                <button type="button" className="btn btn-outline btn-sm" onClick={addCustomStage}>
                                    + Tambah Tahap
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="form-actions" style={{ borderTop: 'none', marginTop: 0 }}>
                    <button type="button" className="btn btn-outline" onClick={() => navigate('/projects')}>
                        ❌ Batal
                    </button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={!title || !category || (category !== 'lainnya' && !projectType)}>
                        ✅ Buat Proyek
                    </button>
                </div>
            </form>

            {/* KB Popup */}
            {showKbPopup && (
                <div className="modal-overlay" onClick={() => setShowKbPopup(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Informasi</h2>
                            <button className="modal-close" onClick={() => setShowKbPopup(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                            <p style={{ color: 'var(--text-secondary)' }}>Belum ada pedoman kerja untuk kategori ini.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setShowKbPopup(false)}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
