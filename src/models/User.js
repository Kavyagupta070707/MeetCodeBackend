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
    },
    rating:{
        type: Number,
        default: 1000
    }
},{timestamps: true})

const User = mongoose.model("User",userschema)

export default User;
