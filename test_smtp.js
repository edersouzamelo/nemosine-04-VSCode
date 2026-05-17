const nodemailer = require('nodemailer');

async function main() {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // This is likely what was missing!
        auth: {
            user: 'edersouzamelo@gmail.com',
            pass: 'udrn sxis wmwn ekmz',
        },
    });

    try {
        const info = await transporter.sendMail({
            from: '"Nemosine Test" <edersouzamelo@gmail.com>',
            to: "edersouzamelo@gmail.com",
            subject: "Test SMTP",
            text: "Checking if port 465 + secure:true works",
        });
        console.log("Message sent: %s", info.messageId);
    } catch (e) {
        console.error("SMTP ERROR:", e);
    }
}

main();
