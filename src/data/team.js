// Tim Penerbitan - 8 Personil
export const TEAM = [
    {
        id: 'tantawi',
        name: 'Tantawi',
        role: 'Ketua Kelompok Kerja',
        isAdmin: true,
        skills: ['Admin', 'QC'],
        avatar: 'TW'
    },
    {
        id: 'tazun',
        name: 'Tazun',
        role: 'Personil',
        isAdmin: false,
        skills: ['Naskah', 'Administrasi', 'ISBN', 'Distribusi'],
        avatar: 'TZ'
    },
    {
        id: 'hafiz',
        name: 'Hafiz',
        role: 'Personil',
        isAdmin: false,
        skills: ['Naskah', 'Administrasi', 'ISBN', 'Distribusi'],
        avatar: 'HF'
    },
    {
        id: 'azizah',
        name: 'Azizah',
        role: 'Personil',
        isAdmin: false,
        skills: ['Penyuntingan', 'Keuangan', 'Medsos', 'SK Terbit'],
        avatar: 'AZ'
    },
    {
        id: 'aria',
        name: 'Aria',
        role: 'Personil',
        isAdmin: false,
        skills: ['Penyuntingan', 'Keuangan'],
        avatar: 'AR'
    },
    {
        id: 'novi',
        name: 'Novi',
        role: 'Personil',
        isAdmin: false,
        skills: ['Penyuntingan', 'Tata Letak', 'Desain Sampul'],
        avatar: 'NV'
    },
    {
        id: 'sandi',
        name: 'Sandi',
        role: 'Personil',
        isAdmin: false,
        skills: ['Penyuntingan', 'Tata Letak', 'Desain Sampul', 'Medsos'],
        avatar: 'SD'
    },
    {
        id: 'damaji',
        name: 'Damaji',
        role: 'Personil',
        isAdmin: false,
        skills: ['Tata Letak', 'Desain Sampul', 'QC'],
        avatar: 'DJ'
    }
]

// Mapping skill ke tahapan - digunakan untuk filter PJ
export const STAGE_SKILL_MAP = {
    'Kelengkapan Naskah': ['Naskah', 'Administrasi'],
    'Pembuatan Surat Penerimaan Terbitan': ['Naskah', 'Administrasi'],
    'Penyuntingan': ['Penyuntingan'],
    'Tata Letak Naskah': ['Tata Letak'],
    'Desain Sampul': ['Desain Sampul'],
    'Kendali Kualitas': ['QC'],
    'Penerbitan ISBN': ['ISBN'],
    'Unggah ke Sipena dan Ipusnas': ['Naskah', 'Administrasi'],
    'Pembuatan Surat Keterangan Terbit': ['SK Terbit', 'Administrasi'],
    'Serah Terima Karya Cetak dan Rekam': ['Distribusi', 'Administrasi'],
    // Medsos
    'Penyusunan Teks': ['Medsos', 'Penyuntingan'],
    'Perancangan Desain': ['Medsos', 'Desain Sampul'],
    'Tinjauan Konten': ['Medsos', 'QC'],
    'Pengunggahan': ['Medsos'],
    // Keuangan
    'Dokumen rincian anggaran belanja APBN': ['Keuangan'],
    'Kerangka Acuan Kerja (KAK) Penerbitan': ['Keuangan'],
    'Implementasi Kegiatan Penerbitan': ['Keuangan'],
    'Pertanggungjawaban dan Administrasi Keuangan': ['Keuangan'],
    'Verifikasi dan Validasi Hasil Kegiatan': ['Keuangan', 'QC'],
    'Laporan Kinerja dan Evaluasi Kegiatan': ['Keuangan']
}

// Mendapatkan PJ yang sesuai untuk suatu tahapan
export function getEligiblePJ(stageName) {
    const requiredSkills = STAGE_SKILL_MAP[stageName] || []
    if (requiredSkills.length === 0) return TEAM.filter(m => !m.isAdmin)
    return TEAM.filter(member =>
        !member.isAdmin && member.skills.some(s => requiredSkills.includes(s))
    )
}
