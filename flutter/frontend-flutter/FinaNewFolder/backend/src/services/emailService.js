const transporter = require('../config/email');
const logger = require('../utils/logger');

class EmailService {
  // Send OTP email
  async sendOTPEmail(email, otp, purpose = 'verification') {
    try {
      const subjects = {
        verification: 'Email Verification OTP',
        'password-reset': 'Password Reset OTP',
        'phone-verification': 'Phone Verification OTP'
      };

      const titles = {
        verification: 'Verify Your Email',
        'password-reset': 'Reset Your Password',
        'phone-verification': 'Verify Your Phone'
      };

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Application'}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: subjects[purpose] || 'Verification OTP',
        html: this.getOTPEmailTemplate(otp, titles[purpose] || 'Verify Your Account')
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`OTP email sent to ${email}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`Failed to send OTP email to ${email}: ${error.message}`);
      throw new Error('Failed to send verification email');
    }
  }
  
  // --- NEW FUNCTION: The fix for the TypeError ---
  // Send email upon successful password change
  async sendPasswordChangedEmail(email, name) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Application'}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Security Alert: Your Password Has Been Changed',
        html: this.getPasswordChangedTemplate(name)
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Password changed confirmation sent to ${email}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`Failed to send password changed email to ${email}: ${error.message}`);
      // Don't throw a critical error; the password was already reset successfully
      return { success: false };
    }
  }

  // Send admin signup notification to super admin
  async sendAdminSignupNotification(adminEmail, tempPassword) {
    try {
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

      if (!superAdminEmail) {
        logger.error('Super admin email not configured');
        throw new Error('Super admin email not configured');
      }

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Application'}" <${process.env.EMAIL_FROM}>`,
        to: superAdminEmail,
        subject: 'New Admin Account Created',
        html: this.getAdminSignupTemplate(adminEmail, tempPassword)
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Admin signup notification sent to super admin: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`Failed to send admin signup notification: ${error.message}`);
      throw new Error('Failed to send admin notification');
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email, name) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Application'}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Welcome to Our Platform',
        html: this.getWelcomeEmailTemplate(name)
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}: ${error.message}`);
      // Don't throw error for welcome emails as they're not critical
      return { success: false };
    }
  }

  // OTP Email Template
  getOTPEmailTemplate(otp, title) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .otp-box { background: #f8f9fa; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px dashed #667eea; }
          .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You requested a verification code. Please use the following One-Time Password (OTP) to complete your verification:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p><strong>This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</strong></p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              Never share this OTP with anyone. Our team will never ask for your OTP.
            </div>
            <p>If you didn't request this code, please ignore this email or contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Application'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // --- NEW TEMPLATE: Password Changed Template ---
  getPasswordChangedTemplate(name) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .alert { background: #f8d7da; border-left: 4px solid #dc3545; color: #721c24; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Changed Alert</h1>
          </div>
          <div class="content">
            <p>Dear ${name || 'User'},</p>
            <div class="alert">
              <strong>Action Confirmed:</strong><br>
              Your password was successfully changed on our platform.
            </div>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p>If you made this change, you can safely ignore this email.</p>
            <p><strong>If you did NOT change your password, please contact our support team immediately to secure your account.</strong></p>
            <p>Best regards,<br>The ${process.env.APP_NAME || 'Application'} Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Admin Signup Template
  getAdminSignupTemplate(adminEmail, tempPassword) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .credentials { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Admin Account Created</h1>
          </div>
          <div class="content">
            <p><strong>Dear Super Admin,</strong></p>
            <p>A new admin account has been created in the system. Below are the credentials:</p>
            <div class="credentials">
              <p><strong>Email:</strong> ${adminEmail}</p>
              <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
              <p><strong>Created At:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              Please ensure this admin account was authorized. If you did not authorize this account creation, take immediate action to secure your system.
            </div>
            <p>The new admin will need to change their password upon first login.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Welcome Email Template
  getWelcomeEmailTemplate(name) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Our Platform!</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Welcome aboard! We're thrilled to have you join our community.</p>
            <p>Your account has been successfully verified and you can now access all features.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();