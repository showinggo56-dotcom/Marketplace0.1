import OTP from '../models/OTP.js';
import { sendEmail } from '../config/nodemailer.js';

/**
 * Generate and send OTP to user's email
 * @param {String} email - User's email address
 * @param {String} purpose - Purpose of OTP (signup, signin, password_reset, email_change)
 * @param {Object} meta - Additional metadata (ipAddress, userAgent)
 * @returns {Object} Result with success status and message
 */
export const createAndSendOTP = async (email, purpose = 'signup', meta = {}) => {
  try {
    // Invalidate any existing OTPs for this email and purpose
    await OTP.deleteMany({ email, purpose, verified: false });

    // Generate new OTP
    const otpCode = OTP.generateOTP();

    // OTP expires in 60 seconds as per requirement
    const expiresAt = new Date(Date.now() + 60 * 1000);

    // Save OTP to database
    const otpDoc = await OTP.create({
      email,
      otp: otpCode,
      purpose,
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // Send email
    const purposeText = {
      signup: 'Verify your email address to complete registration',
      signin: 'Verify your identity to sign in',
      password_reset: 'Verify your identity to reset your password',
      email_change: 'Verify your new email address',
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Verification Code</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; }
          .body { padding: 32px; }
          .otp-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 24px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 20px 0; border-radius: 4px; color: #856404; font-size: 13px; }
          .footer { padding: 20px 32px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MarketPlace Verification</h1>
          </div>
          <div class="body">
            <p style="font-size: 15px; color: #333; line-height: 1.6;">Hello,</p>
            <p style="font-size: 15px; color: #333; line-height: 1.6;">${purposeText[purpose] || 'Verify your identity'} on MarketPlace.</p>
            <p style="font-size: 15px; color: #333; line-height: 1.6;">Your one-time verification code is:</p>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            <div class="warning">
              <strong>Important:</strong> This code will expire in <strong>60 seconds</strong> and can only be used once.
            </div>
            <p style="font-size: 13px; color: #6c757d;">If you didn't request this code, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>MarketPlace &copy; 2025. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `Your MarketPlace verification code is: ${otpCode}\n\nThis code will expire in 60 seconds.\n\nIf you didn't request this code, you can safely ignore this email.`;

    const emailResult = await sendEmail({
      to: email,
      subject: `Your MarketPlace Verification Code - ${otpCode}`,
      html: htmlContent,
      text: textContent,
    });

    if (!emailResult.success) {
      // Clean up OTP if email failed
      await OTP.deleteOne({ _id: otpDoc._id });
      return {
        success: false,
        message: 'Failed to send OTP email. Please try again.',
        error: emailResult.error,
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully to your email',
      expiresAt,
    };
  } catch (error) {
    console.error('Error in createAndSendOTP:', error);
    return {
      success: false,
      message: 'Failed to generate OTP. Please try again.',
      error: error.message,
    };
  }
};

/**
 * Verify an OTP code
 * @param {String} email - User's email
 * @param {String} otp - OTP code entered by user
 * @param {String} purpose - Purpose of OTP
 * @returns {Object} Result with success status
 */
export const verifyOTPCode = async (email, otp, purpose = 'signup') => {
  try {
    // Find the most recent unverified OTP for this email and purpose
    const otpDoc = await OTP.findOne({
      email,
      purpose,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return {
        success: false,
        message: 'No active OTP found. Please request a new one.',
      };
    }

    await otpDoc.verifyOTP(otp);

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

export default { createAndSendOTP, verifyOTPCode };
