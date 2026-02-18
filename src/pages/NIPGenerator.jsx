import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { DDC_CODES, SOURCE_KEGIATAN, FORMAT_BUKU } from '../data/ddc'
import JsBarcode from 'jsbarcode'

export default function NIPGenerator() {
    const { getNextNipNumber } = useApp()

    const [ddcCode, setDdcCode] = useState('')
    const [ddcSearch, setDdcSearch] = useState('')
    const [showDdcDropdown, setShowDdcDropdown] = useState(false)
    const [selectedDate, setSelectedDate] = useState('')
    const [sumber, setSumber] = useState('')
    const [format, setFormat] = useState('')
    const [generatedNip, setGeneratedNip] = useState(null)
    const [nipHistory, setNipHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem('nipHistory') || '[]') } catch { return [] }
    })

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

    // Save history
    useEffect(() => {
        localStorage.setItem('nipHistory', JSON.stringify(nipHistory))
    }, [nipHistory])

    // Filter DDC codes
    const filteredDDC = DDC_CODES.filter(d => {
        const term = ddcSearch.toLowerCase()
        return d.code.includes(term) || d.label.toLowerCase().includes(term)
    })

    const selectedDDC = DDC_CODES.find(d => d.code === ddcCode)

    const handleGenerate = () => {
        if (!ddcCode || !selectedDate || !sumber || !format) {
            alert('Mohon lengkapi semua field!')
            return
        }

        const date = new Date(selectedDate)
        const year = date.getFullYear().toString()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const yearMonth = `${year}${month}`
        const formattedDate = `${day}/${month}/${year}` // DD/MM/YYYY

        const nomorUrut = getNextNipNumber(year)

        const visual = `${ddcCode} - ${yearMonth} - ${sumber} - ${nomorUrut} - ${format}`
        const barcode = `${ddcCode}${yearMonth}${sumber}${nomorUrut}${format}`

        const result = {
            visual,
            barcode,
            ddcCode,
            ddcLabel: selectedDDC?.label || '',
            yearMonth,
            formattedDate, // Store human readable date
            sumber: SOURCE_KEGIATAN.find(s => s.code === sumber)?.label || sumber,
            nomorUrut,
            format: FORMAT_BUKU.find(f => f.code === format)?.label || format,
            createdAt: new Date().toISOString()
        }

        setGeneratedNip(result)
        setNipHistory(prev => [result, ...prev].slice(0, 50))
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
                                {SOURCE_KEGIATAN.map(s => (
                                    <option key={s.code} value={s.code}>{s.label} ({s.code})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Format Buku *</label>
                            <select value={format} onChange={e => setFormat(e.target.value)}>
                                <option value="">Pilih</option>
                                {FORMAT_BUKU.map(f => (
                                    <option key={f.code} value={f.code}>{f.label} ({f.code})</option>
                                ))}
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
                        <div className="card-title" style={{ marginBottom: '0.75rem' }}>Riwayat NIP</div>
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
                                            <th>NIP</th>
                                            <th>DDC</th>
                                            <th>Tanggal</th>
                                            <th>Format</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nipHistory.slice(0, 10).map((nip, idx) => (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{nip.visual}</td>
                                                <td>{nip.ddcCode}</td>
                                                <td>{nip.formattedDate || nip.yearMonth}</td>
                                                <td>{nip.format}</td>
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
