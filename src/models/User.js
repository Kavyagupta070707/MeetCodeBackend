import mongoose from "mongoose";

const userschema = new mongoose.Schema({
    name : {
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique:  true
    },
    profileimage:{
        type: String,
        default: ""
    },
    clerkId:{
        type: String,
        required: true,
        unique:  true
    }
},{timestamps: true})

const User = mongoose.model("User",userschema)

export default User;