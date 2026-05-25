const nodemailer = require('nodemailer');

async function main() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpUser || !smtpPassword) {
        throw new Error('Set SMTP_USER and SMTP_PASSWORD before running this script.');
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: smtpUser,
            pass: smtpPassword,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"Nemosine Test" <${smtpUser}>`,
            to: smtpUser,
            subject: 'Test SMTP',
            text: 'Checking if port 465 + secure:true works',
        });
        console.log('Message sent: %s', info.messageId);
    } catch (e) {
        console.error('SMTP ERROR:', e);
    }
}

main();
