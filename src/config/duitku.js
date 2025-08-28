import dotenv from "dotenv";
dotenv.config();

export default {
  merchantCode: process.env.DUITKU_MERCHANT_CODE,
  apiKey: process.env.DUITKU_API_KEY,
  isProduction: process.env.DUITKU_IS_PRODUCTION, // otomatis boolean
  callbackUrl: process.env.DUITKU_CALLBACK_URL,
  returnUrl: process.env.DUITKU_RETURN_URL,
  expiryPeriod: parseInt(process.env.DUITKU_EXPIRY_PERIOD, 10) || 1440, // default 1 hari
};
