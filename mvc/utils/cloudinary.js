import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();



cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        console.log('Attempting to upload file:', localFilePath);
        
        if (!localFilePath) {
            console.error('No file path provided');
            return null;
        }

        if (!fs.existsSync(localFilePath)) {
            console.error('File does not exist:', localFilePath);
            return null;
        }

        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        console.log('Upload successful:', res);
        fs.unlinkSync(localFilePath); // Remove the file after upload
        return res;
    } catch (error) {
        console.error('Upload error:', error.message);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // Clean up on error
        }
        return null;
    }
};


const uploadBase64ImageToCloudinary = async (base64Image) => {
    try {
      console.log('Attempting to upload base64 image to Cloudinary');
  
      if (!base64Image) {
        console.error('No base64 image provided');
        return null;
      }
  
      // Make sure base64 string has the proper format (including the data prefix)
      if (!base64Image.startsWith('data:image')) {
        console.error('Invalid base64 image format');
        return null;
      }
  
      // Upload base64 image to Cloudinary
      const res = await cloudinary.uploader.upload(base64Image, {
        resource_type: 'image',
      });
  
      console.log('Upload successful');
      return res; // Return the result (including the URL)
    } catch (error) {
      console.error('Cloudinary upload error:', error.message);
      return null;
    }
  };
   const deleteImageFromCloudinary = async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error.message);
      throw error;
    }
  };

export {uploadOnCloudinary,uploadBase64ImageToCloudinary,deleteImageFromCloudinary}