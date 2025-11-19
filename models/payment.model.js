import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  // Customer Information
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, trim: true, lowercase: true },
  mobile: { 
    type: String, 
    required: true, 
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be 10 digits'
    }
  },
  
  // Address Information (Only for Andhra Pradesh, Telangana, Odisha)
  address: {
    village: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    pincode: { 
      type: String, 
      required: true, 
      validate: {
        validator: function(v) {
          return /^\d{6}$/.test(v);
        },
        message: 'Pincode must be 6 digits'
      }
    },
    state: { 
      type: String, 
      required: true, 
      enum: ['Andhra Pradesh', 'Telangana', 'Odisha'],
      message: 'We only deliver to Andhra Pradesh, Telangana, and Odisha'
    }
  },
  
  // Book Information
  bookDetails: {
    bookCode: { type: String, required: true, trim: true },
    bookName: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 }
  },
  
  // Payment Information
  payment: {
    utr: { 
      type: String, 
      required: true, 
      unique: true,
      validate: {
        validator: function(v) {
          return /^\d{12}$/.test(v);
        },
        message: 'UTR number must be 12 digits'
      }
    },
    amount: { type: Number, required: true, min: 1 },
    upiId: { type: String, required: true, default: '7416219267@ybl' },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending'
    }
  },
  
  // Order Management
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // Admin Notes
  adminNotes: { type: String, default: '' },
  
  // Timestamps for order tracking
  orderDate: { type: Date, default: Date.now },
  confirmedDate: { type: Date },
  shippedDate: { type: Date },
  deliveredDate: { type: Date },
  
  // Email tracking
  emailSent: { type: Boolean, default: false },
  emailSentDate: { type: Date }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address
paymentSchema.virtual('fullAddress').get(function() {
  return `${this.address.village}, ${this.address.district}, ${this.address.state} - ${this.address.pincode}`;
});

// Index for faster queries
paymentSchema.index({ 'bookDetails.bookCode': 1 });
paymentSchema.index({ orderStatus: 1 });
paymentSchema.index({ createdAt: -1 });

export default mongoose.model("Payment", paymentSchema);
