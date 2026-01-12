import {StreamChat} from "stream-chat"
import {ENV} from "./env.js"
import {StreamClient} from "@stream-io/node-sdk"
const apikey=ENV.STREAM_API_KEY
const apiSecret=ENV.STREAM_API_SECRET

if(!apikey || !apiSecret){
    throw new Error("Stream API key or secret is not defined in environment variables")
}

export const videoclient = new StreamClient(apikey, apiSecret);
export const streamClient = StreamChat.getInstance(apikey, apiSecret);

export const upsertStreamUser = async (userdata)=>{
    try {
        streamClient.upsertUser(userdata)
         console.log(`Stream user with ID ${userdata.id} upserted successfully.`);
    } catch (error) {
        console.error("Error upserting stream user", error);
        throw error;
    }
}
export const deleteStreamUser = async (userId)=>{
    try {
        streamClient.deleteUser(userId)
        console.log(`Stream user with ID ${userId} deleted successfully.`);
    } catch (error) {
        console.error("Error deleting stream user", error);
        throw error;
    }
}