import nodemailer from 'nodemailer';
import { verifyContactConfig } from '../config.js';

let transporter;
let cachedSettings;

const getSettings = () => {
  if (!cachedSettings) {
    cachedSettings = verifyContactConfig();
  }
  return cachedSettings;
};

const getTransporter = () => {
  if (!transporter) {
    const settings = getSettings();
    transporter = nodemailer.createTransport({
      host: settings.smtp.host,
      port: settings.smtp.port,
      secure: settings.smtp.secure,
      auth: {
        user: settings.smtp.user,
        pass: settings.smtp.pass,
      },
    });
  }
  return transporter;
};

export const sendContactEmail = async ({ name, email, phone, serviceInterest, message, metadata = {} }) => {
  const settings = getSettings();
  const mailer = getTransporter();

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    serviceInterest ? `Service Interest: ${serviceInterest}` : null,
    '',
    'Message:',
    message,
    '',
    metadata.ip ? `Submitted from IP: ${metadata.ip}` : null,
    metadata.userAgent ? `User Agent: ${metadata.userAgent}` : null,
  ].filter(Boolean);

  await mailer.sendMail({
    from: settings.fromAddress ?? settings.smtp.user,
    to: settings.toAddress,
    replyTo: email,
    subject: `${settings.subjectPrefix} New contact request from ${name}`,
    text: lines.join('\n'),
  });
};
