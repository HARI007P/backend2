// Backend/services/emailScheduler.service.js
import Payment from "../models/payment.model.js";
import nodemailer from "nodemailer";
import cron from "node-cron";

// Create email transporter (lazy initialization)
function getEmailTransporter() {
  return nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Function to check and send emails for orders that are 2+ hours old
export const checkAndSendEmails = async () => {
  try {
    console.log("🔍 Checking orders for email notifications...");
    
    // Find orders that are 2+ hours old and haven't been emailed yet
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    const ordersToEmail = await Payment.find({
      createdAt: { $lte: twoHoursAgo }, // Order placed 2+ hours ago
      emailSent: { $ne: true }, // Email not sent yet
      orderStatus: { $in: ["confirmed", "cancelled"] } // Status has been changed by admin
    });
    
    console.log(`📊 Found ${ordersToEmail.length} orders ready for email notification`);
    
    for (const order of ordersToEmail) {
      await sendStatusEmail(order);
    }
    
    console.log("✅ Email check completed");
  } catch (error) {
    console.error("❌ Email check error:", error);
  }
};

// Function to send appropriate email based on order status
const sendStatusEmail = async (order) => {
  try {
    console.log(`📧 Sending email for order ${order._id} with status: ${order.orderStatus}`);
    
    if (order.orderStatus === "confirmed") {
      await sendOrderConfirmedEmail(order);
    } else if (order.orderStatus === "cancelled") {
      await sendOrderCancelledEmail(order);
    }
    
    // Mark email as sent
    order.emailSent = true;
    order.emailSentDate = new Date();
    await order.save();
    
    console.log(`✅ Email sent successfully for order ${order._id}`);
  } catch (error) {
    console.error(`❌ Error sending email for order ${order._id}:`, error);
  }
};

// Success email template
async function sendOrderConfirmedEmail(order) {
  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 20px; border-radius: 12px; color: white; text-align: center;">
          <h1>🎉 Order Confirmed!</h1>
          <h2>Payment Verified Successfully!</h2>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; margin-top: 15px; background: #f9fafb;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${order.customerName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Excellent news! We have successfully verified your payment and your order is now confirmed. 
            Your book will be delivered to your address within 3 working days.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="color: #16a34a; margin-bottom: 15px;">📋 Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold;">Order ID:</td><td>${order._id.toString().slice(-8)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Book:</td><td>${order.bookDetails.bookName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Amount Paid:</td><td>₹${order.payment.amount}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">UTR Number:</td><td>${order.payment.utr}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Order Date:</td><td>${order.createdAt.toLocaleDateString('en-IN')}</td></tr>
            </table>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1d4ed8; margin-bottom: 15px;">📍 Delivery Information</h3>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${order.fullAddress}</p>
            <p style="margin: 5px 0;"><strong>Mobile:</strong> ${order.mobile}</p>
            <p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> Within 3 working days</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1e40af; margin-bottom: 10px;">🚚 What happens next?</h4>
            <div style="color: #1e40af;">
              <p style="margin: 8px 0;">📦 <strong>Step 1:</strong> Your order is being prepared for dispatch</p>
              <p style="margin: 8px 0;">🚛 <strong>Step 2:</strong> Book will be shipped within 1-2 days</p>
              <p style="margin: 8px 0;">📍 <strong>Step 3:</strong> Delivery within 3 working days</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
            <h3 style="color: #16a34a;">Thank you for choosing HariBookStore! 📚</h3>
            <p style="font-size: 18px; color: #059669;">Happy Reading! 🎉</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">
              Track your order anytime by visiting our website<br>
              For any queries, reply to this email
            </p>
          </div>
        </div>
      </div>
    `;

    const emailTransporter = getEmailTransporter();
    await emailTransporter.sendMail({
      from: `"HariBookStore 📚" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `🎉 Order Confirmed: ${order.bookDetails.bookName} - Delivery in 3 days!`,
      html: emailContent
    });
    
    console.log(`📧 Confirmation email sent to ${order.customerEmail}`);
  } catch (error) {
    console.error("📧 Error sending confirmation email:", error);
  }
}

// Failure email template
async function sendOrderCancelledEmail(order) {
  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; border-radius: 12px; color: white; text-align: center;">
          <h1>❌ Order Cancelled</h1>
          <h2>Payment Verification Failed</h2>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; margin-top: 15px; background: #f9fafb;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear <strong>${order.customerName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            We're sorry to inform you that we couldn't verify your payment for the following order. 
            Your order has been cancelled, but you can try placing a new order with the correct payment details.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="color: #dc2626; margin-bottom: 15px;">📋 Cancelled Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold;">Order ID:</td><td>${order._id.toString().slice(-8)}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Book:</td><td>${order.bookDetails.bookName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">UTR Number:</td><td>${order.payment.utr}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Expected Amount:</td><td>₹${order.payment.amount}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Order Date:</td><td>${order.createdAt.toLocaleDateString('en-IN')}</td></tr>
            </table>
          </div>
          
          ${order.adminNotes ? `
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h4 style="color: #dc2626; margin-bottom: 10px;">📝 Reason for Cancellation:</h4>
            <p style="color: #991b1b;">${order.adminNotes}</p>
          </div>
          ` : ''}
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #92400e; margin-bottom: 15px;">🔄 What you can do next:</h4>
            <div style="color: #92400e;">
              <p style="margin: 8px 0;">✅ <strong>Check Payment:</strong> Verify the payment was made to <strong>7416219267@ybl</strong></p>
              <p style="margin: 8px 0;">✅ <strong>Check UTR:</strong> Ensure UTR is exactly 12 digits</p>
              <p style="margin: 8px 0;">✅ <strong>Check Amount:</strong> Confirm you paid exactly ₹35</p>
              <p style="margin: 8px 0;">📞 <strong>Contact Us:</strong> If you believe this is an error</p>
              <p style="margin: 8px 0;">🔄 <strong>Retry:</strong> Place a new order with correct details</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
            <h3 style="color: #dc2626;">We apologize for the inconvenience</h3>
            <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">
              📧 Reply to this email if you need assistance<br>
              📞 Contact: +91 7416219267<br>
              🌐 Visit our website to place a new order
            </p>
          </div>
        </div>
      </div>
    `;

    const emailTransporter = getEmailTransporter();
    await emailTransporter.sendMail({
      from: `"HariBookStore 📚" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `❌ Order Cancelled: ${order.bookDetails.bookName} - Payment Issue`,
      html: emailContent
    });
    
    console.log(`📧 Cancellation email sent to ${order.customerEmail}`);
  } catch (error) {
    console.error("📧 Error sending cancellation email:", error);
  }
}

// Start the email scheduler service
export const startEmailScheduler = () => {
  console.log("🚀 Starting email scheduler service...");
  
  // Run every 15 minutes to check for orders ready for email notification
  cron.schedule('*/15 * * * *', () => {
    console.log("⏰ Running scheduled email check...");
    checkAndSendEmails();
  });
  
  console.log("⏰ Email scheduler started (checks every 15 minutes)");
};

// Manual trigger for testing
export const triggerManualEmailCheck = () => {
  console.log("🧪 Manual email check triggered");
  checkAndSendEmails();
};