import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: `"LibroHub" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Código de recuperación de contraseña',
    text: `Tu código de recuperación es: ${code}\n\nExpira en 15 minutos.`,
    html: `
      <p>Hola,</p>
      <p>Tu código de recuperación de contraseña es:</p>
      <h2 style="letter-spacing: 4px;">${code}</h2>
      <p>Este código expira en <strong>15 minutos</strong>.</p>
      <p>Si no solicitaste esto, ignora este correo.</p>
    `,
  });
}
