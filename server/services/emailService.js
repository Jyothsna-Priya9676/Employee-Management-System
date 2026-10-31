
import nodemailer from "nodemailer";

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_APP_PASSWORD;

const transporter =
  emailUser && emailPassword
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPassword.replace(/\s/g, ""),
        },
      })
    : null;

export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    throw new Error(
      "Email configuration is missing. Check EMAIL_USER and EMAIL_APP_PASSWORD."
    );
  }

  return transporter.sendMail({
    from: `"Smart HRMS" <${emailUser}>`,
    to,
    subject,
    text,
    html,
  });
}

export async function verifyEmailConnection() {
  if (!transporter) {
    throw new Error(
      "Email configuration is missing. Check EMAIL_USER and EMAIL_APP_PASSWORD."
    );
  }

  await transporter.verify();
  return true;
}
