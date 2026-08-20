import mongoose from "mongoose";
import User from "./User.js"
const sessionschema = new mongoose.Schema({
    mode:{
        type: String,
        enum: ['private','one-v-one'],
        default: 'private'
    },
    problemTitle: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true
    },
    host:{
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required: true
    },
    participant:{
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        default: null
    },
    sessionCode:{
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true
    },
    status:{
        type: String,
        enum: ['waiting','active','completed'],
        default: 'active'
    },
    winner:{
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        default: null
    },
    loser:{
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        default: null
    },
    result:{
        type: String,
        enum: ['winner','draw','cancelled', null],
        default: null
    },
    resultReason:{
        type: String,
        enum: ['solved','forfeit','timeout','cancelled', null],
        default: null
    },
    startedAt:{
        type: Date,
        default: null
    },
    endsAt:{
        type: Date,
        default: null
    },
    completedAt:{
        type: Date,
        default: null
    },
    callId:{
        type: String,
        default: ""
    }
}, {timestamps: true})

const Session = mongoose.model("Session", sessionschema);

export default Session;
