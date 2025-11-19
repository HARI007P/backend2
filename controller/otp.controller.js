// Backend/controller/otp.controller.js
import User from "../models/user.model.js";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Create email transporter
function getEmailTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use Gmail App Password
    },
  });
}

// Generate 6-digit OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ✅ Send OTP for Signup
export const sendOTP = async (req, res) => {
  const { email, fullname, password } = req.body;

  if (!email || !fullname || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email, fullname, and password are required" });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res
      .status(500)
      .json({ success: false, message: "Email service not configured properly" });
  }

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.verified) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists and is verified. Please login instead." });
    }
    
    // If user exists but is not verified, we'll proceed to resend OTP
    if (existingUser && !existingUser.verified) {
      console.log(`📧 Resending OTP to unverified user: ${email}`);
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(password, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert user in DB
    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        fullname,
        password: passwordHash,
        otp: otpHash,
        otpExpiresAt,
        verified: false,
      },
      { upsert: true, new: true }
    );

    // Send OTP email
    const transporter = getEmailTransporter();
    await transporter.verify();

    await transporter.sendMail({
      from: `"HariBookStore OTP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Your Account Verification Code - HariBookStore",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
            <h1>📚 HariBookStore</h1>
            <h2>Account Verification</h2>
            <p>Hello <strong>${fullname}</strong>!</p>
            <p>Use the OTP below to verify your account:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #e91e63; letter-spacing: 4px;">${otp}</span>
            </div>
            <p style="color: #999;">⏰ Expires in <strong>5 minutes</strong></p>
            <p>Need help? Contact us at <strong>customer.haribookstore@gmail.com</strong></p>
          </div>
        </div>
      `,
    });

    res.status(200).json({ success: true, message: "OTP sent successfully" });

  } catch (err) {
    console.error("❌ Send OTP Error:", err);
    let message = "Failed to send OTP";

    if (err.code === "EAUTH") message = "Email authentication failed. Check Gmail App Password.";
    else if (err.code === "ECONNECTION") message = "Cannot connect to email server. Check your internet.";
    else if (err.responseCode === 535) message = "Invalid email credentials. Verify Gmail App Password.";

    res.status(500).json({
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ✅ Verify OTP and Complete Signup
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !user.otp) {
      return res.status(400).json({ success: false, message: "User not found or OTP missing" });
    }

    if (user.otpExpiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Mark user as verified
    user.verified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const JWT_SECRET = process.env.JWT_SECRET || "haribookstore_default_secret_key_2024";
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      success: true,
      message: "Account created successfully! Welcome to HariBookStore! 🎉",
      user: {
        _id: user._id,
        email: user.email,
        fullname: user.fullname,
        verified: user.verified,
      },
      token,
    });
  } catch (err) {
    console.error("❌ Verify OTP Error:", err);
    res.status(500).json({ success: false, message: "Verification failed", error: err.message });
  }
};
