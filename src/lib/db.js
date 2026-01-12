import mongoose from 'mongoose';
import {ENV} from './env.js';

export const connectDB = async () => {
    try {
        if(!ENV.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        const conn = await mongoose.connect(ENV.MONGODB_URI);
        console.log('Connected to MongoDB', conn.connection.host);
    } catch (error) {
        console.error("Error connecting to Mongodb", error);
        process.exit(1);
    }
}