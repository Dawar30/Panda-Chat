import api from "./axios"

export const signup = async (formData) => {
    try {
        const res = await api.post('/user/signup', formData);
        return res.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}

export const login = async (formData) => {
    try {
        const res = await api.post('/user/login', formData);
        return res.data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export const logout = async () => {
    try {
        const res = await api.post('/user/logout');
        return res.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}
