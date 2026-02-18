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

function ProtectedRoute({ children }) {
    const { currentUser } = useApp()
    if (!currentUser) return <Navigate to="/login" replace />
    return children
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
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
