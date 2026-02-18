import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
    HiOutlineBell, HiOutlineSun, HiOutlineMoon,
    HiOutlineArrowRightOnRectangle, HiOutlineCheck
} from 'react-icons/hi2'

export default function Header() {
    const { currentUser, theme, toggleTheme, notifications, unreadCount,
        markNotificationRead, markAllNotificationsRead, logout } = useApp()
    const [showNotif, setShowNotif] = useState(false)
    const [showUser, setShowUser] = useState(false)
    const notifRef = useRef(null)
    const userRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
            if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Page title
    const getTitle = () => {
        const path = location.pathname
        if (path === '/') return 'Dashboard'
        if (path === '/projects') return 'Proyek'
        if (path === '/projects/new') return 'Proyek Baru'
        if (path.startsWith('/projects/')) return 'Detail Proyek'
        if (path === '/archive') return 'Arsip'
        if (path === '/nip') return 'NIP Generator'
        if (path === '/documents') return 'Dokumen'
        if (path === '/reports') return 'Laporan'
        return 'Dashboard'
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const recentNotifs = notifications.slice(0, 10)

    const formatTime = (iso) => {
        const d = new Date(iso)
        const now = new Date()
        const diff = Math.floor((now - d) / 60000) // minutes
        if (diff < 1) return 'Baru saja'
        if (diff < 60) return `${diff} menit lalu`
        if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`
        return `${Math.floor(diff / 1440)} hari lalu`
    }

    return (
        <header className="header">
            <div className="header-left">
                <h1>{getTitle()}</h1>
            </div>

            <div className="header-right">
                {/* Theme toggle */}
                <button className="header-btn" onClick={toggleTheme} title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}>
                    {theme === 'light' ? <HiOutlineMoon /> : <HiOutlineSun />}
                </button>

                {/* Notifications */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button className="header-btn" onClick={() => setShowNotif(!showNotif)}>
                        <HiOutlineBell />
                        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </button>

                    {showNotif && (
                        <div className="notification-dropdown">
                            <div className="notification-header">
                                <span>Notifikasi</span>
                                {unreadCount > 0 && (
                                    <button className="btn btn-ghost btn-sm" onClick={markAllNotificationsRead}>
                                        <HiOutlineCheck /> Tandai semua dibaca
                                    </button>
                                )}
                            </div>
                            <div className="notification-list">
                                {recentNotifs.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        Belum ada notifikasi
                                    </div>
                                ) : (
                                    recentNotifs.map(n => (
                                        <div
                                            key={n.id}
                                            className={`notification-item ${!n.read ? 'unread' : ''}`}
                                            onClick={() => {
                                                markNotificationRead(n.id)
                                                if (n.projectId) navigate(`/projects/${n.projectId}`)
                                                setShowNotif(false)
                                            }}
                                        >
                                            <div className="notif-icon" style={{
                                                background: n.type === 'revision' ? 'var(--danger-light)' :
                                                    n.type === 'review' ? 'var(--warning-light)' :
                                                        n.type === 'approved' ? 'var(--success-light)' :
                                                            'var(--primary-light)',
                                                color: n.type === 'revision' ? 'var(--danger)' :
                                                    n.type === 'review' ? 'var(--warning)' :
                                                        n.type === 'approved' ? 'var(--success)' :
                                                            'var(--primary)'
                                            }}>
                                                {n.type === 'revision' ? '🔄' : n.type === 'review' ? '📤' : n.type === 'approved' ? '✅' : '📋'}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div className="notif-text">
                                                    <strong>{n.title}</strong><br />{n.message}
                                                </div>
                                                <div className="notif-time">{formatTime(n.createdAt)}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User menu */}
                <div ref={userRef} style={{ position: 'relative' }}>
                    <div className="user-menu" onClick={() => setShowUser(!showUser)}>
                        <div className="user-avatar">{currentUser?.avatar}</div>
                        <div>
                            <div className="user-name">{currentUser?.name}</div>
                            <div className="user-role">{currentUser?.role}</div>
                        </div>
                    </div>
                    {showUser && (
                        <div className="notification-dropdown" style={{ width: '200px' }}>
                            <div style={{ padding: '0.5rem' }}>
                                <button className="nav-item" onClick={handleLogout} style={{ width: '100%', color: 'var(--danger)' }}>
                                    <HiOutlineArrowRightOnRectangle style={{ fontSize: '1.125rem' }} />
                                    <span>Keluar</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
