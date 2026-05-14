const requiredProductionEnv = [
  "MONGO_URI",
  "JWT_SECRET_KEY",
  "REFRESH_TOKEN_SECRET_KEY",
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "S3_BUCKET_NAME",
  "KAKAO_REST_API_KEY",
];

const validateRequiredEnv = () => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing = requiredProductionEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

const getCorsOptions = () => {
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    return {};
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  };
};

module.exports = {
  getCorsOptions,
  validateRequiredEnv,
};
