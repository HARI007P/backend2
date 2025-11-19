// Backend/route/otp.route.js
import express from "express";
import { sendOTP, verifyOTP } from "../controller/otp.controller.js";

const router = express.Router();

router.post("/send", sendOTP);       // /api/otp/send
router.post("/verify", verifyOTP);   // /api/otp/verify

export default router;
