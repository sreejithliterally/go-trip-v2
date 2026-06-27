const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"GoTrip" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your GoTrip verification code',
    text:    `Your OTP is: ${otp}. It expires in 5 minutes.`,
    html:    `<p>Your GoTrip verification code is: <strong>${otp}</strong></p><p>It expires in 5 minutes.</p>`,
  });
};

module.exports = { sendOtpEmail };
