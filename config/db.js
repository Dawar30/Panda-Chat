import mongoose from "mongoose";
import dotenv from "dotenv"


const DBconnection = async () => {
    try {
        const conn = await mongoose.connect(process.env.Mongo_URI)
        console.log(`MongoDB connected successfully ${conn.connection.host}`);
    } catch (error) {
        console.log(`Error in connecting MongoDB ${error}`);
    }
}

export default DBconnection