import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../services/api'
import { DDC_CODES, SOURCE_KEGIATAN, FORMAT_BUKU } from '../data/ddc'
import { utils, writeFile } from 'xlsx'
import JsBarcode from 'jsbarcode'

export default function NIPGenerator() {

    const [ddcCode, setDdcCode] = useState('')
    const [ddcSearch, setDdcSearch] = useState('')
    const [showDdcDropdown, setShowDdcDropdown] = useState(false)
    const [selectedDate, setSelectedDate] = useState('')
    const [sumber, setSumber] = useState('')
    const [format, setFormat] = useState('')
    const [title, setTitle] = useState('') // Judul Buku
    const [generatedNip, setGeneratedNip] = useState(null)
    const [nipHistory, setNipHistory] = useState([])

    // Load history from backend on mount
    useEffect(() => {
        api.nip.getHistory()
            .then(data => setNipHistory(data))
            .catch(err => console.error("Failed to load history", err))
    }, [])

    const barcodeRef = useRef(null)
    const ddcRef = useRef(null)

    // Close DDC dropdown on outside click
    useEffect(() => {
        function handleClick(e) {
            if (ddcRef.current && !ddcRef.current.contains(e.target)) setShowDdcDropdown(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Generate barcode when NIP changes
    useEffect(() => {
        if (generatedNip && barcodeRef.current) {
            try {
                JsBarcode(barcodeRef.current, generatedNip.barcode, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: false,
                    margin: 5
                })
            } catch (e) {
                console.log('Barcode error:', e)
            }
        }
    }, [generatedNip])

    // Filter DDC codes
    const filteredDDC = DDC_CODES.filter(d => {
        const term = ddcSearch.toLowerCase()
        return d.code.includes(term) || d.label.toLowerCase().includes(term)
    })

    const selectedDDC = DDC_CODES.find(d => d.code === ddcCode)

    const handleGenerate = async () => {
        if (!ddcCode || !selectedDate || !sumber || !format || !title) {
            alert('Mohon lengkapi semua field!')
            return
        }

        try {
            // Call backend API
            const record = await api.nip.generate({
                ddcCode,
                date: selectedDate,
                sourceCode: sumber,
                formatCode: format,
                title
            })

            const result = {
                visual: record.visualFormat,
                barcode: record.barcode,
                title: record.title,
                ddcCode: record.ddcCode,
                ddcLabel: record.ddcLabel || selectedDDC?.label || '',
                yearMonth: record.yearMonth,
                formattedDate: record.formattedDate,
                sumber: SOURCE_KEGIATAN.find(s => s.code === record.sourceCode)?.label || record.sourceCode,
                nomorUrut: record.serialNumber.toString().padStart(3, '0'),
                format: FORMAT_BUKU.find(f => f.code === record.formatCode)?.label || record.formatCode,
                createdAt: record.createdAt || new Date().toISOString()
            }

            setGeneratedNip(result)
            setNipHistory(prev => [result, ...prev])
        } catch (e) {
            console.error('NIP generate error:', e)
            alert('Gagal generate NIP: ' + (e.message || 'Unknown error'))
        }
    }

    const handleExport = () => {
        if (nipHistory.length === 0) return alert('Tidak ada data untuk diekspor')

        const data = nipHistory.map((item, idx) => ({
            No: idx + 1,
            'Judul Buku': item.title || '-',
            'NIP (Visual)': item.visualFormat || item.visual,
            'NIP (Barcode)': item.barcode,
            'Kode DDC': item.ddcCode,
            'Label DDC': item.ddcLabel || '-',
            'Tanggal': item.formattedDate || item.yearMonth,
            'Sumber': item.sourceCode || '-',
            'Format': item.formatCode || '-'
        }))

        const ws = utils.json_to_sheet(data)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, "Riwayat NIP")
        writeFile(wb, `Riwayat_NIP_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => alert('Tersalin ke clipboard!'))
            .catch(() => {
                const el = document.createElement('textarea')
                el.value = text
                document.body.appendChild(el)
                el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
                alert('Tersalin!')
            })
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>🔢 Generator Nomor Induk Penerbitan (NIP)</h1>
                    <p>Standarisasi identitas buku — 14 digit</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Input */}
                <div className="card">
                    <div className="card-title" style={{ marginBottom: '1rem' }}>Input Data</div>

                    {/* Judul Buku */}
                    <div className="form-group">
                        <label className="form-label">Judul Buku *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Masukkan judul buku..."
                        />
                    </div>

                    {/* DDC Searchable Dropdown */}
                    <div className="form-group">
                        <label className="form-label">Kode DDC (3 digit) *</label>
                        <div className="searchable-dropdown" ref={ddcRef}>
                            <input
                                type="text"
                                value={ddcSearch || (selectedDDC ? `${selectedDDC.code} - ${selectedDDC.label}` : '')}
                                onChange={e => { setDdcSearch(e.target.value); setShowDdcDropdown(true); setDdcCode('') }}
                                onFocus={() => setShowDdcDropdown(true)}
                                placeholder="Cari kode DDC... (cth: 370 atau Pendidikan)"
                            />
                            {showDdcDropdown && (
                                <div className="dropdown-menu">
                                    {filteredDDC.length === 0 ? (
                                        <div className="dropdown-item" style={{ color: 'var(--text-muted)' }}>Tidak ditemukan</div>
                                    ) : (
                                        filteredDDC.map(d => (
                                            <div
                                                key={d.code}
                                                className={`dropdown-item ${d.code === ddcCode ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setDdcCode(d.code)
                                                    setDdcSearch('')
                                                    setShowDdcDropdown(false)
                                                }}
                                            >
                                                <strong>{d.code}</strong> — {d.label}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        {selectedDDC && (
                            <div className="form-hint" style={{ color: 'var(--primary)' }}>
                                ✓ {selectedDDC.code} — {selectedDDC.label}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tanggal Terbit *</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Sumber Kegiatan *</label>
                            <select value={sumber} onChange={e => setSumber(e.target.value)}>
                                <option value="">Pilih</option>
                                <option value="1">Umum (1)</option>
                                <option value="2">Inkubator (2)</option>
                                <option value="3">DAK (3)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Format Buku *</label>
                            <select value={format} onChange={e => setFormat(e.target.value)}>
                                <option value="">Pilih</option>
                                <option value="1">Cetak (1)</option>
                                <option value="2">Digital (2)</option>
                                <option value="3">Keduanya (3)</option>
                            </select>
                        </div>
                    </div>

                    <button className="btn btn-primary w-full" onClick={handleGenerate}>
                        🔢 Generate NIP
                    </button>
                </div>

                {/* Result */}
                <div>
                    {generatedNip ? (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <div className="card-title" style={{ marginBottom: '1rem' }}>Hasil NIP</div>

                            <div className="nip-result">
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
                                    {generatedNip.title}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    Format Visual (Human Readable)
                                </div>
                                <div className="nip-visual">{generatedNip.visual}</div>

                                <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    Format Barcode (Machine Readable)
                                </div>
                                <div className="nip-barcode">
                                    <div style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                        {generatedNip.barcode}
                                    </div>
                                    <svg ref={barcodeRef}></svg>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                                <button className="btn btn-outline btn-sm" onClick={() => copyToClipboard(generatedNip.visual)}>
                                    📋 Salin Visual
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => copyToClipboard(generatedNip.barcode)}>
                                    📋 Salin Barcode
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <div className="empty-state">
                                <div className="empty-icon">🔢</div>
                                <h3>Belum ada NIP</h3>
                                <p>Isi data di sebelah kiri dan klik "Generate NIP" untuk membuat nomor induk penerbitan.</p>
                            </div>
                        </div>
                    )}

                    {/* History */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div className="card-title">Riwayat NIP</div>
                            <button className="btn btn-outline btn-sm" onClick={handleExport}>
                                📥 Unduh Excel
                            </button>
                        </div>

                        {nipHistory.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem' }}>
                                Belum ada riwayat
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>Judul Buku</th>
                                            <th>NIP</th>
                                            <th>DDC</th>
                                            <th>Tanggal</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nipHistory.slice(0, 10).map((nip, idx) => (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td>{nip.title || '-'}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                    {nip.visualFormat || nip.visual}
                                                </td>
                                                <td>{nip.ddcCode}</td>
                                                <td>{nip.formattedDate || nip.yearMonth}</td>
                                                <td>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(nip.barcode)}>
                                                        📋
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
