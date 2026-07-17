const AUTH_TOKEN_KEY = "panda-chat-token";
const AUTH_USER_KEY = "panda-chat-user";

export const setAuthToken = (token, user) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getUser = () => {
    if (typeof window === "undefined") return null;
    const userStr = window.localStorage.getItem(AUTH_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
};

export const clearAuthToken = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
};

export const isAuthenticated = () => Boolean(getAuthToken());