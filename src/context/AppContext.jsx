import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { CATEGORIES } from '../data/categories'
// import { TEAM } from '../data/team' // Might need this for team list if not from API

const AppContext = createContext(null)

export function AppProvider({ children }) {
    // User session
    const [currentUser, setCurrentUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

    // Data State
    const [projects, setProjects] = useState([])
    const [notifications, setNotifications] = useState([])
    const [nipHistory, setNipHistory] = useState([]) // Was nipCounters, now history list
    const [documents, setDocuments] = useState([])

    // Enrich project data with category labels
    const enrichProjects = (rawProjects) => {
        return rawProjects.map(p => {
            const catConfig = CATEGORIES[p.category] || {}
            const typeConfig = catConfig.types?.find(t => t.id === p.type)
            return {
                ...p,
                categoryLabel: catConfig.label || p.category || '—',
                categoryIcon: catConfig.icon || '📋',
                typeLabel: typeConfig?.label || p.type || '—',
                singlePJ: catConfig.singlePJ || false,
            }
        })
    }

    // Load initial data
    const refreshData = useCallback(async () => {
        if (!currentUser) return;
        try {
            const [projRes, notifRes, nipRes, docRes] = await Promise.all([
                api.projects.getAll(),
                api.notifications.getAll(),
                api.nip.getHistory(),
                api.documents.getAll().catch(() => [])
            ])
            setProjects(enrichProjects(projRes))
            setNotifications(notifRes)
            setNipHistory(nipRes)
            setDocuments(docRes)
        } catch (e) {
            console.error("Failed to fetch data", e)
        }
    }, [currentUser])

    useEffect(() => {
        // Check session
        api.auth.getSession()
            .then(session => {
                if (session && session.user) {
                    setCurrentUser(session.user)
                }
            })
            .catch(() => { }) // No session
            .finally(() => setIsLoading(false))
    }, [])

    useEffect(() => {
        if (currentUser) {
            refreshData()
            // Optional: Set up polling or websocket here
            const interval = setInterval(refreshData, 10000) // Poll every 10s
            return () => clearInterval(interval)
        } else {
            setProjects([])
            setNotifications([])
        }
    }, [currentUser, refreshData])


    // Theme persistence
    useEffect(() => {
        localStorage.setItem('theme', theme)
    }, [theme])

    // Theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light')
    }, [])

    // Auth actions
    const login = useCallback(async (email, password) => {
        try {
            const signInResult = await api.auth.signIn(email, password)
            const session = await api.auth.getSession()
            if (session?.user) {
                const userStatus = session.user.status || 'pending'
                const userRole = session.user.role

                // Admin always gets in
                if (userRole === 'admin') {
                    setCurrentUser(session.user)
                    return true
                }

                // Non-admin: check status
                if (userStatus === 'pending') {
                    await api.auth.signOut() // Sign out pending users
                    return 'pending'
                }
                if (userStatus === 'disabled') {
                    await api.auth.signOut() // Sign out disabled users
                    return 'disabled'
                }

                setCurrentUser(session.user)
                return true
            }
            return false
        } catch (e) {
            console.error(e)
            return false
        }
    }, [])

    const logout = useCallback(async () => {
        try {
            await api.auth.signOut()
            setCurrentUser(null)
            setProjects([])
            setNotifications([])
        } catch (e) { console.error(e) }
    }, [])

    const isAdmin = currentUser?.role === 'admin'


    // Project Actions
    const addProject = useCallback(async (projectData) => {
        try {
            const newProject = await api.projects.create(projectData)
            await refreshData()
            return newProject
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const updateProject = useCallback(async (id, updates) => {
        try {
            await api.projects.update(id, updates)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const deleteProject = useCallback(async (id) => {
        try {
            await api.projects.delete(id)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const updateStage = useCallback(async (stageId, updates) => {
        try {
            await api.stages.update(stageId, updates)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    const addStageNote = useCallback(async (stageId, note) => {
        try {
            await api.stages.addNote(stageId, note)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    // Notifications
    const markNotificationRead = useCallback(async (id) => {
        try {
            await api.notifications.markRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        } catch (e) { console.error(e) }
    }, [])

    const markAllNotificationsRead = useCallback(async () => {
        try {
            await api.notifications.markAllRead()
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        } catch (e) { console.error(e) }
    }, [])

    // Add notification (Shim, empty as backend handles it)
    const addNotification = useCallback(() => { }, [])


    const unreadCount = notifications.filter(n => !n.read).length

    // NIP - Updated to use API
    const getNextNipNumber = useCallback(async (year) => {
        // Fallback or deprecated
        return 0;
    }, [])

    const saveNipHistory = useCallback(async (data) => {
        try {
            await api.nip.generate(data)
            await refreshData()
        } catch (e) {
            console.error(e)
            throw e
        }
    }, [refreshData])

    // Documents
    const addDocument = useCallback(async (data) => {
        try {
            await api.documents.create(data)
            await refreshData()
        } catch (e) {
            console.error('Failed to add document:', e)
            throw e
        }
    }, [refreshData])

    const deleteDocument = useCallback(async (id) => {
        try {
            await api.documents.delete(id)
            await refreshData()
        } catch (e) {
            console.error('Failed to delete document:', e)
            throw e
        }
    }, [refreshData])

    const value = {
        currentUser,
        isAdmin,
        setCurrentUser, // kept for manual overrides if needed (e.g. testing)
        login,
        logout,
        isLoading,
        theme,
        toggleTheme,
        projects,
        addProject,
        updateProject,
        deleteProject,
        updateStage,
        addStageNote,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        nipHistory, // Expose history list
        saveNipHistory,
        documents,
        // Deprecated/Shimmed
        getNextNipNumber,
        addNotification,
        addDocument,
        deleteDocument,
        // Stats (re-implement or fetch from backend later)
        activeProjects: projects.filter(p => !['done', 'archived'].includes(p.status)),
        reviewPending: projects.filter(p => p.stages?.some(s => s.status === 'review')),
        overdueProjects: [], // Calc on frontend for now
        completedThisMonth: []
    }

    return (
        <AppContext.Provider value={value}>
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Loading...
                </div>
            ) : (
                children
            )}
        </AppContext.Provider>
    )
}

export function useApp() {
    const context = useContext(AppContext)
    if (!context) throw new Error('useApp must be used within AppProvider')
    return context
}
