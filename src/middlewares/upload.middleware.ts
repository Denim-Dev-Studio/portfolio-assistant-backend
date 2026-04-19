import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype === 'text/csv' ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.xlsx');

    if (!allowed) {
      return cb(new Error('Only CSV and XLSX files are allowed'));
    }

    cb(null, true);
  },
});