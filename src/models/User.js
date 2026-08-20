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
    },
    ratingHistory:[
        {
            rating:{
                type: Number,
                required: true
            },
            change:{
                type: Number,
                default: 0
            },
            reason:{
                type: String,
                enum: ['initial','win','loss','forfeit'],
                default: 'initial'
            },
            session:{
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            createdAt:{
                type: Date,
                default: Date.now
            }
        }
    ]
},{timestamps: true})

const User = mongoose.model("User",userschema)

export default User;
