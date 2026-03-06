// Mapping: Stage Label → Required Skills (matches user.skills jsonb array)
// Skills harus sesuai dengan nilai yang disimpan di user.skills di database

export const STAGE_SKILL_MAP: Record<string, string[]> = {
    // Terbitan
    "Kelengkapan Naskah": ["administrasi"],
    "Pembuatan Surat Penerimaan Terbitan": ["administrasi"],
    "Pembuatan Surat Keterangan Terbit": ["administrasi"],
    "Serah Terima Karya Cetak dan Rekam": ["administrasi"],

    "Penerbitan ISBN": ["isbn"],
    "Penerbitan Nomor Induk Penerbitan (NIP)": ["isbn"],

    "Penyuntingan": ["editor"],

    "Terjemahkan": ["penerjemah"],
    "Penyuntingan Naskah Terjemahan": ["penerjemah"],

    "Unggah ke Sipena atau Ipusnas": ["distribusi"],

    // Medsos
    "Penyusunan Teks": ["konten"],
    "Perancangan Desain": ["konten"],
    "Tinjauan Konten": ["konten"],
    "Pengunggahan": ["konten"],

    // Keuangan
    "Dokumen rincian anggaran belanja APBN untuk tim kerja pemerbitan": ["keuangan"],
    "Kerangka Acuan Kerja (KAK) Penerbitan": ["keuangan"],
    "Implementasi Kegiatan Penerbitan": ["keuangan"],
    "Pertanggungjawaban dan Administrasi Keuangan Kegiatan": ["keuangan"],
    "Verifikasi dan Validasi Hasil Kegiatan oleh Ketua Kelompok Kerja (Kapokja)": ["keuangan"],
    "Laporan Kinerja dan Evaluasi Kegiatan": ["keuangan"],

    // Layout & Desain
    "Tata Letak Naskah": ["layout"],
    "Desain Sampul": ["desain"],

    // QC
    "Kendali Kualitas": ["qc"],
};

/**
 * Get required skills for a stage label.
 * Returns empty array if no mapping found (meaning any active user is eligible).
 */
export function getRequiredSkills(stageLabel: string): string[] {
    return STAGE_SKILL_MAP[stageLabel] || [];
}
