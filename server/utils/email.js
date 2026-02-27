// utils/email.js

import nodemailer from 'nodemailer';

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use app password, not regular password
  },
});

export const sendPasswordResetEmail = async (email, resetUrl, userName = 'User') => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'ShopBook - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ShopBook</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Password Reset</p>
          </div>

          <!-- Body -->
          <div style="background: #f8fafc; padding: 40px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
              Hi <strong>${userName}</strong>,
            </p>

            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 20px 0;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>

            <!-- Reset Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="
                background: linear-gradient(135deg, #0d9488 0%, #115e59 100%);
                color: white;
                padding: 12px 40px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: 16px;
                display: inline-block;
              ">
                Reset Password
              </a>
            </div>

            <!-- Or copy link -->
            <p style="color: #64748b; font-size: 13px; text-align: center; margin: 20px 0;">
              Or copy and paste this link in your browser:
            </p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #0d9488; word-break: break-all;">
              <p style="color: #0d9488; font-size: 12px; margin: 0; font-family: 'Courier New', monospace;">
                ${resetUrl}
              </p>
            </div>

            <!-- Important Info -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: bold;">⏰ Important:</p>
              <p style="color: #92400e; font-size: 13px; margin: 5px 0 0 0;">
                This link will expire in <strong>1 hour</strong> for security reasons.
              </p>
            </div>

            <!-- Not requested section -->
            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 25px 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not change unless you click the link above.
            </p>

            <!-- Footer -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                © 2024 ShopBook. All rights reserved.
              </p>
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 5px 0 0 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.response);
    return info;

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

// Optional: Test email configuration
export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
};