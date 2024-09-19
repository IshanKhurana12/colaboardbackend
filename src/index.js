import { app } from './Socket/socket.js';
import express from "express"
import connectDB from './mongodb/setup.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import server from './Socket/socket.js';






dotenv.config({
    path:'./.env'
})
//load the envirnmental variables

connectDB(); //call to mongo db to eun the setup




app.use(express.json());

app.use(express.urlencoded({extended:true}));

app.use(express.static("public"));
app.use(cookieParser());


//import routes
import userRouter from './mvc/routes/user.routes.js'

app.use('/api/v1/users',userRouter);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
