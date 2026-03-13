
const API_URL = '/api';

async function fetchAPI(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Important for Better Auth cookie-based auth
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `API Error: ${response.statusText}`);
    }

    // Handle empty responses (e.g. 204 No Content)
    const text = await response.text();
    return text ? JSON.parse(text) : {};
}

export const api = {
    // Auth - Better Auth uses specific endpoint names
    auth: {
        signIn: (email, password) => fetchAPI('/auth/sign-in/email', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),
        signUp: (data) => fetchAPI('/auth/sign-up/email', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        signOut: () => fetchAPI('/auth/sign-out', { method: 'POST' }),
        getSession: () => fetchAPI('/auth/get-session'),
    },

    // Projects
    projects: {
        getAll: () => fetchAPI('/projects'),
        getOne: (id) => fetchAPI(`/projects/${id}`),
        create: (data) => fetchAPI('/projects', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchAPI(`/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`/projects/${id}`, { method: 'DELETE' }),
        getArchived: () => fetchAPI('/projects/archived'),
    },

    // Stages
    stages: {
        create: (data) => fetchAPI('/stages', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchAPI(`/stages/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        addNote: (id, note) => fetchAPI(`/stages/${id}/notes`, {
            method: 'PATCH',
            body: JSON.stringify(note)
        }),
        getCandidates: (id) => fetchAPI(`/stages/${id}/candidates`),
        getCandidatesByLabel: (label) => fetchAPI(`/stages/candidates-by-label?label=${encodeURIComponent(label)}`),
    },

    // Notifications
    notifications: {
        getAll: () => fetchAPI('/notifications'),
        markRead: (id) => fetchAPI(`/notifications/${id}/read`, { method: 'PATCH' }),
        markAllRead: () => fetchAPI('/notifications/read-all', { method: 'PATCH' }),
    },

    // NIP
    nip: {
        getHistory: () => fetchAPI('/nip/history'),
        generate: (data) => fetchAPI('/nip/generate', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // Admin - User Management
    admin: {
        getUsers: () => fetchAPI('/admin/users'),
        updateUser: (id, data) => fetchAPI(`/admin/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
    },

    // Documents
    documents: {
        getAll: () => fetchAPI('/documents'),
        create: (data) => fetchAPI('/documents', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`/documents/${id}`, { method: 'DELETE' }),
    },
};
