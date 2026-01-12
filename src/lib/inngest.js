import {Inngest} from "inngest";
import { connectDB } from "./db.js";
import User from "../models/User.js";
import { deleteStreamUser, upsertStreamUser } from "./stream.js";

export const inngest = new Inngest({ id: "meetcode-app"})

const syncUser = inngest.createFunction(
    {id: "sync-user"},
    {event: "clerk/user.created" },
    async ({event, step})=>{
        await connectDB();
        const {id, email_addresses, first_name,last_name, image_url} = event.data;

        const newUser = new User({
            clerkId: id,
            email: email_addresses[0]?.email_address,
            name: `${first_name || ""} ${last_name || ""}`,
            profileimage: image_url,
        })

        await User.create(newUser);


        await upsertStreamUser({
            id: newUser.id.toString(),
            name: newUser.name,
            image: newUser.profileimage
        })
    }
) 
const deleteUser = inngest.createFunction(
    {id: "delete-user"},
    {event: "clerk/user.deleted" },
    async ({event, step})=>{
        await connectDB();
        const {id} = event.data;

       
        await User.deleteOne({ clerkId: id });

        await deleteStreamUser(id.toString());
    }
) 

export const functions = [syncUser, deleteUser]