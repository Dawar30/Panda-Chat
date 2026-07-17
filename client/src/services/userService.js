
import api from "./axios"

export const getAllUsers = async () => {
    try {
        const res = await api.get('/user/all');
        return res.data.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}