
const API_URL = '/api';

async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token'); // Placeholder for Better Auth handling if needed manually

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Better Auth handles session via cookies usually, but if we need a token:
    // if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }

    return response.json();
}

export const api = {
    // Auth
    auth: {
        signIn: (email, password) => fetchAPI('/auth/sign-in', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),
        signUp: (data) => fetchAPI('/auth/sign-up', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        signOut: () => fetchAPI('/auth/sign-out', { method: 'POST' }),
        getSession: () => fetchAPI('/auth/session'),
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
    },

    // Stages
    stages: {
        update: (id, data) => fetchAPI(`/stages/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        addNote: (id, note) => fetchAPI(`/stages/${id}/notes`, {
            method: 'POST',
            body: JSON.stringify(note)
        }),
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
    }

    // Documents - To be implemented
};
