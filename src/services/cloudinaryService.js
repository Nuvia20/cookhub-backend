import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = (file, folder) => {
  if (!file) return Promise.resolve(null);

  const missingVariables = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ].filter((variable) => !process.env[variable]);

  if (missingVariables.length > 0) {
    return Promise.reject(
      new Error(`Faltan variables de Cloudinary: ${missingVariables.join(', ')}`),
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error('Cloudinary no devolvió una URL para la imagen'));
          return;
        }

        resolve(result.secure_url);
      },
    );

    stream.end(file.buffer);
  });
};