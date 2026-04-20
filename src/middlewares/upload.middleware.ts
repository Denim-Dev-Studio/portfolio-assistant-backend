import multer from "multer";
import { AppError } from "../errors/appError";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype === "text/csv" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.endsWith(".csv") ||
      file.originalname.endsWith(".xlsx");

    if (!allowed) {
      return cb(AppError.unsupportedMediaType("Only CSV and XLSX files are allowed."));
    }

    cb(null, true);
  },
});