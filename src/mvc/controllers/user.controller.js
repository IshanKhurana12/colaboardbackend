import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser=asyncHandler(async(req,res)=>{

   
    const {email,username,password}=req.body
      console.log(email,username,password)
   
    if(
        [email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"all fields are required")

    }

    const existingUser=await User.findOne({
        $or:[{username}, {email}]
    })
    if(existingUser){
        throw new ApiError(409,"username with email or username exist");
    }


    const avatarLocalPath=req.file?.path;
    
  
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar path is required");
    }

   
   
   
   const avatar=await uploadOnCloudinary(avatarLocalPath);

   if(!avatar){
    throw new ApiError(400,"avatar url is missing");
   }

  const user=await User.create({
    avatar:avatar.url,
    email,
    password,
    username:username.toLowerCase()
   })

  const createdUser=await User.findById(user._id).select("-password -refreshToken")


  if(!createdUser){
    throw new ApiError(500,"something went wrong while registering the user");
  }

  return res.status(201).json(
    new ApiResponse(200,createdUser,"user registered Successfully")
  )
})


///generate access abd refresh tokens
const generateAccessAndRefreshToken=async(userId)=>{
  try {
      const user= await User.findById(userId);
    const accessToken= user.generateAccessToken()
     const refreshToken=user.generateRefreshToken()

     user.refreshToken=refreshToken;
     await user.save({validateBeforeSave:false});
return {accessToken,refreshToken}
  } catch (error) {
      throw new ApiError(500,error,"something went wrong while generating refresh and access token");
  }
}



const loginUser=asyncHandler(async(req,res)=>{
       
  const {email,username,password}=req.body;

 
  if(!email && !username){
      throw new ApiError(400,"username or email is required");
  }

  const user=await User.findOne({
      $or:[{username}, {email}]
  })

  if(!user){
      throw new ApiError(400,"no user found register the user first")
          }
  
  const isPasswordValid=await user.isPasswordCorrect(password);

  if(!isPasswordValid)
  {
      throw new ApiError(400,"password not correct");
  }

const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);

  const loogedInUser=await User.findById(user._id).select("-password -refreshToken")

const options={
  httpOnly:true,
  secure:true
}


return res
.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
  new ApiResponse(
      200,
      {
          user:loogedInUser,accessToken,
          refreshToken
      },"user logged in successfully"
  )
)
})



const logoutUser=asyncHandler(async(req,res)=>{
      
  await User.findByIdAndUpdate(req.user._id,{
       $unset:{refreshToken:1}
   },{
       new:true
   })

   const options={
       httpOnly:true,
       secure:true
     }

     return res
     .status(200)
     .clearCookie("accessToken",options)
     .clearCookie("refreshToken",options)
     .json(new ApiResponse(200,{},"user logged out"))

})






export {registerUser,loginUser,logoutUser}