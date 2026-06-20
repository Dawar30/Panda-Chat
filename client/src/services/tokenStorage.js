const AUTH_TOKEN_KEY = "panda-chat-token";

export const setAuthToken = (token) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const clearAuthToken = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const isAuthenticated = () => Boolean(getAuthToken());