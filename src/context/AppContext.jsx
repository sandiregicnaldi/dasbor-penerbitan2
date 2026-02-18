import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
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

    // Load initial data
    const refreshData = useCallback(async () => {
        if (!currentUser) return;
        try {
            const [projRes, notifRes, nipRes] = await Promise.all([
                api.projects.getAll(),
                api.notifications.getAll(),
                api.nip.getHistory()
            ])
            setProjects(projRes)
            setNotifications(notifRes)
            setNipHistory(nipRes)
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


    // Persist to localStorage
    useEffect(() => { saveState('currentUser', currentUser) }, [currentUser])
    useEffect(() => { saveState('theme', theme) }, [theme])
    useEffect(() => { saveState('projects', projects) }, [projects])
    useEffect(() => { saveState('notifications', notifications) }, [notifications])
    useEffect(() => { saveState('nipCounters', nipCounters) }, [nipCounters])
    useEffect(() => { saveState('documents', documents) }, [documents])

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
            await api.auth.signIn(email, password)
            const session = await api.auth.getSession()
            if (session?.user) setCurrentUser(session.user)
            return true
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

    // Documents (Shim for now)
    const addDocument = useCallback(() => { }, [])
    const deleteDocument = useCallback(() => { }, [])

    const value = {
        currentUser,
        setCurrentUser, // kept for manual overrides if needed (e.g. testing)
        login,
        logout,
        isLoading,
        theme,
        toggleTheme,
        projects,
        addProject,
        updateProject,
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
            {!isLoading && children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const context = useContext(AppContext)
    if (!context) throw new Error('useApp must be used within AppProvider')
    return context
}
