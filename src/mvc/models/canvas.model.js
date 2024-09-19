import mongoose, { mongo, Schema } from "mongoose";

const canvasSchema=new mongoose.Schema({
    roomId:{
        type:String,
        unique:true,
        required:true
    },
    owner:{
       type:Schema.Types.ObjectId,
       ref:"User"
    },
    canvas: [{
        type: String // Store multiple canvas states as strings
    }]
},{timestamps:true});


export const Canvas=mongoose.model("Canvas",canvasSchema);