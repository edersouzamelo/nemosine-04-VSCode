const mail = process.argv[2];
if (!mail) {
    console.log("Forneça um email. Ex: node test_resend.js seuemail@gmail.com");
    process.exit(1);
}

fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer re_HMh2icuF_4nLAe9KUNojmLKjhccCSoAeP`
    },
    body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: mail,
        subject: 'Teste Direto da API Resend',
        html: '<p>Se você recebeu isso, a Resend permitiu o envio para o seu email!</p>'
    })
})
    .then(res => res.json())
    .then(data => {
        console.log("=== RESULTADO DA RESEND ===");
        console.log(data);
    })
    .catch(err => console.error(err));
