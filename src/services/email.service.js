const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});


const sendEmail = async (to, subject, text, html) => {

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  await transporter.sendMail(mailOptions);
};

async function sendRegistrationEmail(userEmail, userName) {
  const subject = "Welcome to Ledger App!";
  const text = `Hi ${userName},\n\nThank you for registering with our Ledger App. We're excited to have you on board!`;
  const html = `<p>Hi ${userName},</p><p>Thank you for registering with our <strong>Ledger App</strong>. We're excited to have you on board!</p>`;

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, userName, amount, toAccount) {

  const subject = "Transaction Alert from Ledger App";
  const text = `Hi ${userName},\n\nA transaction of amount ${amount} has been processed in your account. Please check your account for details.`;
  const html = `<p>Hi ${userName},</p><p>A transaction of amount <strong>${amount}</strong> has been processed in your account. Please check your account for details.</p>`;

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailedEmail(userEmail, userName, amount, toAccount) {

  const subject = "Transaction Failed Alert from Ledger App";
  const text = `Hi ${userName},\n\nA transaction of amount ${amount} to account ${toAccount} has failed. Please check your account for details.`;
  const html = `<p>Hi ${userName},</p><p>A transaction of amount <strong>${amount}</strong> to account <strong>${toAccount}</strong> has failed. Please check your account for details.</p>`;

  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailedEmail,
};
