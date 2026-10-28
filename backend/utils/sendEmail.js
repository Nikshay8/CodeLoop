const { OTP_EXPIRY_MINUTES } = require('./otp');

const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sendEmail = async ({ to, toName, subject, html, text }) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'CodeLoop',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Brevo responded with ${response.status}: ${details}`);
  }
};

const sendOtpEmail = async ({ to, name, otp }) => {
  const safeName = escapeHtml(name);

  await sendEmail({
    to,
    toName: name,
    subject: `${otp} is your CodeLoop verification code`,
    text: `Hi ${name}, your CodeLoop verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't sign up, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 12px;">Verify your email</h2>
        <p>Hi ${safeName}, use this code to finish creating your CodeLoop account:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">${otp}</p>
        <p style="color: #555;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p style="color: #999; font-size: 12px;">If you didn't sign up for CodeLoop, you can safely ignore this email.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async ({ to, name, otp }) => {
  const safeName = escapeHtml(name);

  await sendEmail({
    to,
    toName: name,
    subject: `${otp} is your CodeLoop password reset code`,
    text: `Hi ${name}, your CodeLoop password reset code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email — your password will not change.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 12px;">Reset your password</h2>
        <p>Hi ${safeName}, we received a request to reset your CodeLoop password. Use this code:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">${otp}</p>
        <p style="color: #555;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail, sendPasswordResetEmail };