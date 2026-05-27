import cloudinary from '../config/cloudinary.js';

export const uploadImage = async (fileStream: any, folder: string = 'omnigym') => {
  try {
    const result = await cloudinary.uploader.upload(fileStream, {
      folder: folder,
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

export const deleteImage = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};
