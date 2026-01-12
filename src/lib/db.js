import mongoose from 'mongoose';
import {ENV} from './env.js';

let isConnected = false;

export const connectDB = async () => {
    // If already connected, don't reconnect (important for serverless)
    if (isConnected && mongoose.connection.readyState === 1) {
        console.log('Using existing MongoDB connection');
        return;
    }

    try {
        if(!ENV.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        const conn = await mongoose.connect(ENV.MONGODB_URI);
        isConnected = true;
        console.log('Connected to MongoDB', conn.connection.host);
    } catch (error) {
        console.error("Error connecting to Mongodb", error);
        isConnected = false;
        throw error;
    }
}