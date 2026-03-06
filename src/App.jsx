import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectNew from './pages/ProjectNew'
import ProjectDetail from './pages/ProjectDetail'
import Archive from './pages/Archive'
import NIPGenerator from './pages/NIPGenerator'
import Documents from './pages/Documents'
import Reports from './pages/Reports'
import UserManagement from './pages/UserManagement'

function ProtectedRoute({ children }) {
    const { currentUser } = useApp()
    if (!currentUser) return <Navigate to="/login" replace />
    // Block pending/disabled users
    if (currentUser.status === 'pending') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '3rem' }}>⏳</div>
                <h2>Menunggu Persetujuan</h2>
                <p style={{ color: '#666', maxWidth: '400px', textAlign: 'center' }}>
                    Akun Anda sedang menunggu persetujuan dari admin. Silakan hubungi administrator.
                </p>
                <PendingLogoutButton />
            </div>
        )
    }
    if (currentUser.status === 'disabled') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '3rem' }}>🚫</div>
                <h2>Akun Dinonaktifkan</h2>
                <p style={{ color: '#666', maxWidth: '400px', textAlign: 'center' }}>
                    Akun Anda telah dinonaktifkan. Silakan hubungi administrator untuk informasi lebih lanjut.
                </p>
                <PendingLogoutButton />
            </div>
        )
    }
    return children
}

function PendingLogoutButton() {
    const { logout } = useApp()
    return (
        <button
            className="btn btn-outline"
            onClick={logout}
            style={{ marginTop: '1rem' }}
        >
            🚪 Keluar
        </button>
    )
}

function AdminRoute({ children }) {
    const { currentUser, isAdmin } = useApp()
    if (!currentUser) return <Navigate to="/login" replace />
    if (!isAdmin) return <Navigate to="/" replace />
    return children
}

export default function App() {
    const { currentUser } = useApp()

    if (!currentUser) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        )
    }

    return (
        <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route element={<Layout />}>
                <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="projects/new" element={<AdminRoute><ProjectNew /></AdminRoute>} />
                <Route path="projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                <Route path="archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
                <Route path="nip" element={<ProtectedRoute><NIPGenerator /></ProtectedRoute>} />
                <Route path="documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
