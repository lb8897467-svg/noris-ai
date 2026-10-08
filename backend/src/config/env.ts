import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  jwtExpiry: process.env.JWT_EXPIRY || "30d",
  databaseUrl: process.env.DATABASE_URL || "",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "52428800", 10), // 50MB
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  // In dev/preview mode, OTP codes are returned in the API response for testing
  devOtpReturn: process.env.DEV_OTP_RETURN !== "false",
};
