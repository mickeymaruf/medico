import { Request } from "express";
import { deleteFileFromCloudinary } from "../../../../config/cloudinary.config";

export const deleteUploadedFilesFromGlobalErrorHandler = async (
  req: Request,
) => {
  try {
    const filesToDelete: string[] = [];

    if (req.file && req.file.filename) {
      filesToDelete.push(req.file.filename);
    } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.filename) {
          filesToDelete.push(file.filename);
        }
      });
    } else if (
      req.files &&
      typeof req.files === "object" &&
      !Array.isArray(req.files) &&
      Object.keys(req.files).length > 0
    ) {
      Object.values(req.files).forEach((fileArray) => {
        if (Array.isArray(fileArray)) {
          fileArray.forEach((file) => {
            if (file.path) {
              filesToDelete.push(file.filename);
            }
          });
        }
      });
    }

    if (filesToDelete.length > 0) {
      await Promise.all(
        filesToDelete.map(async (filename) => {
          await deleteFileFromCloudinary(filename);
        }),
      );

      console.log(
        `\nDeleted ${filesToDelete.length} uploaded file(s) from Cloudinary due to an error during request processing.\n`,
      );
    }
  } catch (error: any) {
    console.error(
      "Error deleting uploaded files from Global Error Handler",
      error,
    );
  }
};
