import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { HiOutlinePlus, HiOutlineEye, HiOutlineArrowDownTray, HiOutlineTrash } from 'react-icons/hi2'

export default function Documents() {
    const { documents, addDocument, deleteDocument, isAdmin } = useApp()
    const [showUpload, setShowUpload] = useState(false)
    const [docName, setDocName] = useState('')
    const [docUrl, setDocUrl] = useState('')
    const fileInputRef = useRef(null)

    const handleUpload = (e) => {
        e.preventDefault()
        if (!docName.trim()) return

        // Since we can't store actual files in localStorage, we use URL links
        addDocument({
            name: docName,
            url: docUrl,
            type: 'pdf'
        })

        setDocName('')
        setDocUrl('')
        setShowUpload(false)
    }

    const handleDelete = (docId) => {
        if (window.confirm('Hapus dokumen ini?')) {
            deleteDocument(docId)
        }
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>📄 Dokumen Penting</h1>
                    <p>Daftar berkas penting unit kerja</p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                        <HiOutlinePlus /> Upload Dokumen
                    </button>
                )}
            </div>

            {documents.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📄</div>
                        <h3>Belum ada dokumen</h3>
                        <p>Dokumen penting akan ditampilkan di sini.</p>
                        {isAdmin && (
                            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                                <HiOutlinePlus /> Upload Dokumen Pertama
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    {documents.map(doc => (
                        <div key={doc.id} className="doc-item">
                            <div className="doc-icon">📄</div>
                            <div className="doc-info">
                                <div className="doc-name">{doc.name}</div>
                                <div className="doc-meta">
                                    Diunggah: {formatDate(doc.uploadedAt)} • Oleh: {doc.uploadedBy}
                                </div>
                            </div>
                            <div className="doc-actions">
                                {doc.url && (
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                                        <HiOutlineEye /> Lihat
                                    </a>
                                )}
                                {isAdmin && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(doc.id)}
                                        style={{ color: 'var(--danger)' }}>
                                        <HiOutlineTrash />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <div className="modal-overlay" onClick={() => setShowUpload(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📤 Upload Dokumen</h2>
                            <button className="modal-close" onClick={() => setShowUpload(false)}>✕</button>
                        </div>
                        <form onSubmit={handleUpload}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nama Dokumen *</label>
                                    <input
                                        type="text"
                                        value={docName}
                                        onChange={e => setDocName(e.target.value)}
                                        placeholder="Nama berkas..."
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Link Dokumen (GDrive / URL)</label>
                                    <input
                                        type="url"
                                        value={docUrl}
                                        onChange={e => setDocUrl(e.target.value)}
                                        placeholder="https://drive.google.com/..."
                                    />
                                    <div className="form-hint">Masukkan link ke file PDF di Google Drive atau server lainnya</div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={!docName.trim()}>Upload</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
