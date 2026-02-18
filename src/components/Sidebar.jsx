import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
    HiOutlineHome, HiOutlineFolder, HiOutlineArchiveBox,
    HiOutlineQrCode, HiOutlineDocument, HiOutlineChartBar,
    HiOutlineChevronLeft, HiOutlineChevronRight
} from 'react-icons/hi2'
import { useState } from 'react'

const NAV_ITEMS = [
    { path: '/', icon: HiOutlineHome, label: 'Dashboard', section: 'main' },
    { path: '/projects', icon: HiOutlineFolder, label: 'Proyek', section: 'main' },
    { path: '/archive', icon: HiOutlineArchiveBox, label: 'Arsip', section: 'main' },
    { path: '/nip', icon: HiOutlineQrCode, label: 'NIP Generator', section: 'tools' },
    { path: '/documents', icon: HiOutlineDocument, label: 'Dokumen', section: 'tools' },
    { path: '/reports', icon: HiOutlineChartBar, label: 'Laporan', section: 'tools' },
]

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const { currentUser } = useApp()
    const location = useLocation()

    const mainItems = NAV_ITEMS.filter(i => i.section === 'main')
    const toolItems = NAV_ITEMS.filter(i => i.section === 'tools')

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-logo">
                <img src="/logo.png" alt="Logo" />
                <div className="logo-text">
                    Sistem Manajemen<br />Penerbitan
                    <small>Integrated Workflow Control</small>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-title">Menu Utama</div>
                {mainItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon"><item.icon /></span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}

                <div className="nav-section-title" style={{ marginTop: '0.5rem' }}>Alat</div>
                {toolItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon"><item.icon /></span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronLeft />}
                </button>
            </div>
        </aside>
    )
}

export { Sidebar }
