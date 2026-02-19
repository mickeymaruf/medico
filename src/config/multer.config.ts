import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.config";
import multer from "multer";
import path from "path";

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "video/mp4",
  "application/pdf",
];

const sanitizeFileName = (originalName: string) => {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-") // replace special chars with dash
    .replace(/-+/g, "-") // remove duplicate dashes
    .replace(/^-|-$/g, ""); // trim leading/trailing dash
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error("Unsupported file type");
    }

    let folder = "others";

    if (file.mimetype.startsWith("image")) {
      folder = "images";
    } else if (file.mimetype.startsWith("video")) {
      folder = "videos";
    } else if (file.mimetype === "application/pdf") {
      folder = "documents";
    }

    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);

    return {
      folder: `medico-healthcare/${folder}`,
      public_id: `${Date.now()}-${Math.random().toString(36).substring(2)}-${baseName}`,
      resource_type: "auto",
    };
  },
});

export const parser = multer({ storage: storage });
