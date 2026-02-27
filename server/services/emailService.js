import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function sendPasswordResetEmail(email, resetToken) {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - ShopBook',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>ShopBook Password Reset</h1>
          <p>You requested a password reset. Click the button below:</p>
          <p><a href="${resetUrl}" style="background: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>Link expires in 1 hour.</p>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email, name) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to ShopBook!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Welcome to ShopBook, ${name}!</h1>
          <p>Your account has been successfully created.</p>
          <p>You can now login and start managing your shop.</p>
          <p><a href="${process.env.FRONTEND_URL}/login" style="background: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
}

export async function testEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email service is configured correctly');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    return false;
  }
}