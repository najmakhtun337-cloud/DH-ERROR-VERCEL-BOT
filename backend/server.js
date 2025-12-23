const express = require("express");
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@adiwajshing/baileys");
const qrcode = require("qrcode-terminal");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));

let sock;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({ version, auth: state, printQRInTerminal: true });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode;
            console.log("Connection closed:", reason);
            if (reason !== DisconnectReason.loggedOut) startBot();
        } else if (connection === 'open') {
            console.log("✅ DH ERROR Bot connected!");
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;

        const cmd = text.toLowerCase();

        switch(cmd){
            case 'hi':
                await sock.sendMessage(sender, { text: 'Hello! I am DH ERROR Mini Bot 🤖' });
                break;
            case 'menu':
                await sock.sendMessage(sender, { text: '💡 Commands:\nhi\nmenu\nping\ntime\ndate\nabout\nphoto\ngif\njoke\nquote' });
                break;
            case 'ping':
                await sock.sendMessage(sender, { text: '🏓 Pong!' });
                break;
            case 'time':
                await sock.sendMessage(sender, { text: `⏰ Time: ${new Date().toLocaleTimeString()}` });
                break;
            case 'date':
                await sock.sendMessage(sender, { text: `📅 Date: ${new Date().toLocaleDateString()}` });
                break;
            case 'about':
                await sock.sendMessage(sender, { text: '🤖 DH ERROR Bot\nOwner: CK-ERROR\nFeatures: 50+ commands, media, stickers, GIFs' });
                break;
            case 'photo':
                await sock.sendMessage(sender, { image: { url: 'https://picsum.photos/400' }, caption: 'Random Photo' });
                break;
            case 'gif':
                await sock.sendMessage(sender, { video: { url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.mp4' }, caption: 'Random GIF' });
                break;
            case 'joke':
                try {
                    const res = await fetch('https://v2.jokeapi.dev/joke/Any?type=single');
                    const data = await res.json();
                    await sock.sendMessage(sender, { text: `😂 ${data.joke}` });
                } catch(e){
                    await sock.sendMessage(sender, { text: '❌ Cannot fetch joke now.' });
                }
                break;
            case 'quote':
                try {
                    const res = await fetch('https://api.quotable.io/random');
                    const data = await res.json();
                    await sock.sendMessage(sender, { text: `💬 "${data.content}" —${data.author}` });
                } catch(e){
                    await sock.sendMessage(sender, { text: '❌ Cannot fetch quote now.' });
                }
                break;
            default:
                await sock.sendMessage(sender, { text: '❌ Unknown command. Type *menu* to see commands.' });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();

// Serve frontend dashboard
app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("DH ERROR AI Bot running on port", PORT));
