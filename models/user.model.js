// Backend/models/user.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullname: { type: String },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  verified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiresAt: { type: Date },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
