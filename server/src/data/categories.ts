export const CATEGORIES = {
    terbitan: {
        id: 'terbitan',
        label: 'Terbitan',
        icon: '📖',
        workflow: 'sequential', // estafet
        types: [
            { id: 'reguler', label: 'Umum / Reguler' },
            { id: 'inkubator', label: 'Inkubator Literasi' },
            { id: 'dak', label: 'DAK Non Fisik' },
            { id: 'terjemahan', label: 'Terjemahan' }
        ],
        stages: [
            { id: 'naskah', label: 'Kelengkapan Naskah', order: 1 },
            { id: 'surat-terima', label: 'Pembuatan Surat Penerimaan Terbitan', order: 2 },
            { id: 'sunting', label: 'Penyuntingan', order: 3 },
            { id: 'tata-letak', label: 'Tata Letak Naskah', order: 4 },
            { id: 'sampul', label: 'Desain Sampul', order: 5 },
            { id: 'qc', label: 'Kendali Kualitas', order: 6 },
            { id: 'isbn', label: 'Penerbitan ISBN', order: 7 },
            { id: 'upload', label: 'Unggah ke Sipena dan Ipusnas', order: 8 },
            { id: 'sk-terbit', label: 'Pembuatan Surat Keterangan Terbit', order: 9 },
            { id: 'serah-terima', label: 'Serah Terima Karya Cetak dan Rekam', order: 10 }
        ],
        knowledgeBase: 'https://drive.google.com/file/d/1i-5lT9gTU-KcoPLfIrgYC1lzfXOmZ8it/view'
    },
    medsos: {
        id: 'medsos',
        label: 'Media Sosial',
        icon: '📱',
        workflow: 'sequential', // satu PJ semua tahap
        singlePJ: true,
        types: [
            { id: 'jumat-baca', label: 'Jumat Baca' },
            { id: 'bagi-buku', label: 'Bagi-Bagi Buku' },
            { id: 'medsos-lainnya', label: 'Lainnya' }
        ],
        stages: [
            { id: 'teks', label: 'Penyusunan Teks', order: 1 },
            { id: 'desain', label: 'Perancangan Desain', order: 2 },
            { id: 'tinjauan', label: 'Tinjauan Konten', order: 3 },
            { id: 'unggah', label: 'Pengunggahan', order: 4 }
        ],
        knowledgeBase: null
    },
    keuangan: {
        id: 'keuangan',
        label: 'Keuangan',
        icon: '💰',
        workflow: 'sequential',
        singlePJ: true,
        types: [
            { id: 'gu', label: 'GU' },
            { id: 'langsung', label: 'Langsung' }
        ],
        stages: [
            { id: 'anggaran', label: 'Dokumen rincian anggaran belanja APBN', order: 1 },
            { id: 'kak', label: 'Kerangka Acuan Kerja (KAK) Penerbitan', order: 2 },
            { id: 'implementasi', label: 'Implementasi Kegiatan Penerbitan', order: 3 },
            { id: 'pertanggungjawaban', label: 'Pertanggungjawaban dan Administrasi Keuangan', order: 4 },
            { id: 'verifikasi', label: 'Verifikasi dan Validasi Hasil Kegiatan', order: 5 },
            { id: 'laporan', label: 'Laporan Kinerja dan Evaluasi Kegiatan', order: 6 }
        ],
        knowledgeBase: null
    },
    lainnya: {
        id: 'lainnya',
        label: 'Lainnya',
        icon: '📋',
        workflow: 'parallel', // bisa bersamaan
        types: [],  // input manual
        stages: [], // input manual
        knowledgeBase: null
    }
}
