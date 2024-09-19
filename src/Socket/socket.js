import http from 'http';
import { Server } from 'socket.io';
import { uploadBase64ImageToCloudinary, uploadOnCloudinary,deleteImageFromCloudinary } from "../mvc/utils/cloudinary.js"
import express from "express";
import cors from 'cors';
import { Canvas } from '../mvc/models/canvas.model.js';
import { User } from '../mvc/models/user.models.js';

export const app=express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
      origin: "*",  // Allow all origins or specify one
      methods: ["GET", "POST"]
    }
  });
  
  app.use(cors());
  



  io.on('connection', (socket) => {
    // Retrieve user ID from the query



    const handleLogin = (username) => {
      console.log(`User logged in: ${username}`);
  }

    socket.on('login',(username)=>{
      socket.username=username;
      handleLogin(socket.username);
    })
  
    // Listen for a room join event
    socket.on('createroom',async (roomId,user) => {
      if (!user || !roomId) {
        console.log('Unauthorized attempt to create a room');
        return;
      }

      const result=await Canvas.findOne({roomId:roomId});
      if(result){
        console.log("room alreay exist");
        socket.join(roomId);
        return;
      }
      const newCanvas=new Canvas({
        owner:user,
        roomId:roomId,
        lines:[]
      })

      await newCanvas.save();
      console.log(newCanvas);
      socket.join(roomId);
      console.log(`User with username: ${socket.username} joined room: ${roomId}`);
      io.to(roomId).emit('roomCreated', { roomId, username: socket.username });
    });

    const getActiveRooms = () => {
      const rooms = io.sockets.adapter.rooms;
      const sids = io.sockets.adapter.sids;
    
      // Filter out socket IDs to get only custom room names
      const activeRooms = [...rooms.keys()].filter(roomId => !sids.has(roomId));
    
      return activeRooms;
    };
    

    //now join from existing rooms
    socket.on('joinroom',async(roomId,user)=>{
      if(!roomId || !user){
        console.log("hmm")
        return;
      }
      const result=await Canvas.findOne({roomId:roomId});
      if(!result){
        console.log("choose from active rooms or create new room");
        return;
      }

      const activerooms=getActiveRooms();
     
      const roomExists =  activerooms.includes(roomId);

      if (!roomExists) {
          await Canvas.deleteOne({ roomId });
          console.log("Room was inactive and has been deleted.");
      }
      
      socket.join(roomId);

    
      io.to(roomId).emit('joined', { roomId, joined: user.username });
    })


    socket.on('activerooms', () => {
      console.log("active");
      const activeRooms = getActiveRooms();
      console.log(activeRooms)
      socket.emit('activeRoomsList', activeRooms);
    });
   
 
    
  
  
   //listen for pointer position
   socket.on('pointer', ({ roomId, pointer }) => {
    socket.to(roomId).emit('pointer', { pointer, userId: socket.id });
  });
  
  
    // Listen for messages sent to a room
    socket.on('sendMessage', ({ roomId, message, sender }) => {
      // Emit the message to everyone in the room (including the sender)
     
      io.to(roomId).emit('receiveMessage', { message, sender });
      console.log(`Message from ${sender}: ${message} in room: ${roomId}`);
    });
  
    socket.on('drawing', ({ roomId, line }) => {
      // Broadcast the drawing to other users in the room
     
      socket.to(roomId).emit('drawing', line);
    });
  
   
  
  //recive undo and emit it on the room id 
    socket.on('undo',({roomId,updatedLines})=>{
  
  
      socket.to(roomId).emit('undo',updatedLines);
    })
    
    
   socket.on('sendimage',async(data)=>{
    if(!data.image){
      return
    }
      const image=data.image;
      const user=data.userId;
  
      const imageurl=await uploadBase64ImageToCloudinary(image);
      if(imageurl){
        const result=await Canvas.findOneAndUpdate({
            owner:user
          },
         { $push: { canvas: imageurl.url } },
         { new: true}
        )
          if(!result){

            return;
          }

          const addtouserdb=await User.findByIdAndUpdate(
            {_id:user},
            { $addToSet: { canvas: result._id } },
            { new: true } 
          )

          if(!addtouserdb){
            console.log("not adede");
          }
         
          console.log("Added Successfully");
          
          socket.emit('deletedsuccess',{success:true});
          

      }
     
   })


   const finddata=async(userId)=>{
        const result=await User.findById(userId).populate('canvas');
        return result.canvas
   }


   socket.on('getmycanvas',async({userid})=>{
      
      const result=await finddata(userid);
      console.log(result)
      socket.emit('sendmycanvas',result);
      
   })


   socket.on('deletecanvas', async ({ canvasId, imageUrl,publicid }) => {
    try {
    const publicId=publicid;
 
      // Find the canvas document and remove the image URL
      const canvas = await Canvas.findById(canvasId);
      if (!canvas) {
        console.error('Canvas not found');
        return;
      }
  
      // Remove the image URL from the canvas document
      const updatedCanvas = await Canvas.findByIdAndUpdate(
        canvasId,
        { $pull: { canvas: imageUrl } }, // Remove the URL from the array
        { new: true }
      );
  
      if (!updatedCanvas) {
        console.error('Failed to update canvas');
        return;
      }
  
      // Delete the image from Cloudinary
      await deleteImageFromCloudinary(publicId);
  
      console.log('Canvas image deleted successfully');
    } catch (error) {
      console.error('Error deleting canvas image:', error.message);
    }
  });




//invite user if active or present
socket.on('invite',async({username,inviteename,roomId})=>{

  
    const user=await User.findOne({username:username});

    if(!user){
      console.log("no user exist",username);
      socket.emit('invitestatus',"no user exist invite not sent");
    }

    


    if(user){
        const invite={
          invitefrom:inviteename,
          roomid:roomId,
          to:username
        }
        console.log(invite);
      
       
        io.emit('invitestatus', {invitefrom:inviteename,roomId:roomId,to:username});
    }
})


//user will accept or reject the invite 
//if accept
socket.on('inviteaccept',(roomId)=>{
  console.log("invite accepted");
})



  socket.on('logout',()=>{
    socket.disconnect();
  })
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
  

  export default server;
  