import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { env } from "./env";
import { AppError } from "../utils/AppError";
import status from "http-status";
import path from "path";

cloudinary.config({
  cloud_name: env.CLOUDINARY.CLOUD_NAME,
  api_key: env.CLOUDINARY.API_KEY,
  api_secret: env.CLOUDINARY.API_SECRET,
});

export const uploadFileToCloudinary = async ({
  fileName,
  buffer,
}: {
  fileName: string;
  buffer: Buffer;
}) => {
  if (!fileName || !buffer) {
    throw new AppError(
      "File buffer and file name are required for upload",
      status.BAD_REQUEST,
    );
  }

  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);

  let folder = "others";

  if ([".jpg", ".jpeg", ".png"].includes(ext)) {
    folder = "images";
  } else if ([".mp4"].includes(ext)) {
    folder = "videos";
  } else if (ext === ".pdf") {
    folder = "documents";
  }

  new Promise((resolve, reject) =>
    cloudinary.uploader
      .upload_stream(
        {
          folder: `medico-healthcare/${folder}`,
          public_id: `${Date.now()}-${Math.random().toString(36).substring(2)}-${baseName}`,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            return reject(
              new AppError(
                "Failed to upload file to Cloudinary",
                status.INTERNAL_SERVER_ERROR,
              ),
            );
          }
          return resolve(result as UploadApiResponse);
        },
      )
      .end(buffer),
  );
};

export const deleteFileFromCloudinary = async (filename: string) => {
  const publicId = filename;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    console.log(`File ${publicId} deleted from cloudinary`);
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw new AppError(
      "Failed to delete file from Cloudinary",
      status.INTERNAL_SERVER_ERROR,
    );
  }
};

export default cloudinary;
