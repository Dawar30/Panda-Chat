const AUTH_TOKEN_KEY = "panda-chat-token";
const AUTH_NAME_KEY = "panda-chat-name";

export const setAuthToken = (token, user) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem(AUTH_NAME_KEY, user.name);
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