const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000; // Cloud adaptive port configuration

// CONFIGURATION
const MY_IP = '31.215.50.191'; // Replace with your public IP from Google
const DISCORD_INVITE = 'https://discord.gg/aaPHm48WB3';

// Ensure the 'files' directory exists
const uploadDir = path.join(__dirname, 'files');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configure file storage system
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: storage });

app.use(express.json());

// Strict Cloud-Aware Admin IP Guard Middleware
const requireAdminIP = (req, res, next) => {
    // Look through Render proxy headers first to extract your real IP
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }
    if (clientIp && clientIp.includes('::ffff:')) {
        clientIp = clientIp.split('::ffff:')[1];
    }

    console.log(`Incoming request to admin dashboard from IP: ${clientIp}`);

    // Validate access rights
    if (clientIp === MY_IP || clientIp === '127.0.0.1' || clientIp === '::1') {
        next(); 
    } else {
        // Outputting the exact detected IP so you can copy/paste it into MY_IP if it changes
        res.status(403).send(`
            <body style="font-family:sans-serif; background:#121214; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
                <div style="background:#202024; padding:30px; border-radius:8px; border:1px solid #ff5555; text-align:center; max-width:450px; width:100%;">
                    <h3 style="color:#ff5555; margin-top:0;">Access Denied</h3>
                    <p style="color:#8d8d99; font-size:14px;">Your current network IP is not authorized to open this control panel.</p>
                    <p style="color:#aaa; font-size:13px; font-weight:bold; background:#121214; padding:10px; border-radius:4px; border:1px solid #333;">Detected IP: ${clientIp}</p>
                    <span style="color:#8d8d99; font-size:12px;">If this is you, update the <code>MY_IP</code> variable in your <code>server.js</code> file on GitHub to match this value.</span>
                </div>
            </body>
        `);
    }
};

// Clean Default Welcome Homepage instead of "Cannot GET /"
app.get('/', (req, res) => {
    res.send(`
        <body style="font-family:sans-serif; background:#121214; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
            <div style="text-align:center;">
                <h1 style="color:#00b37e; font-size:36px; margin-bottom:5px;">Lua X Gateway System</h1>
                <p style="color:#8d8d99; font-size:16px;">Secure cloud file verification matrix active.</p>
            </div>
        </body>
    `);
});

// Serve the Admin Dashboard (Protected)
app.get('/admin', requireAdminIP, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin File Upload Processing (Protected)
app.post('/api/upload', requireAdminIP, upload.single('fileToUpload'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    
    // Dynamic generation matching the host URL automatically
    const host = req.get('host');
    const publicLink = `http://${host}/download/${encodeURIComponent(req.file.originalname)}`;
    
    res.send(`
        <body style="font-family:sans-serif; background:#121214; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
            <div style="background:#202024; padding:30px; border-radius:8px; border:1px solid #00b37e; text-align:center; max-width:400px; width:100%;">
                <h3 style="color:#00b37e; margin-top:0;">File Uploaded Successfully!</h3>
                <p style="color:#8d8d99; font-size:14px;">Share this gateway link with your users:</p>
                <input type="text" value="${publicLink}" style="width:calc(100% - 16px); padding:8px; background:#121214; color:#fff; border:1px solid #333; border-radius:4px;" readonly onclick="this.select();">
                <br><br><a href="/admin" style="color:#00b37e; text-decoration:none; font-weight:bold;">← Upload Another File</a>
            </div>
        </body>
    `);
});

// Serve Public Gateway Page (Open to everyone)
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!fs.existsSync(path.join(uploadDir, filename))) {
        return res.status(404).send('File not found or has been removed from cloud storage.');
    }
    res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

// Dynamic Math Generation API
app.get('/api/get-equation', (req, res) => {
    const num1 = Math.floor(Math.random() * 12) + 1;
    const num2 = Math.floor(Math.random() * 12) + 1;
    const expectedAnswer = num1 * num2;
    res.json({ equation: `${num1} × ${num2}`, equationId: expectedAnswer });
});

// Verify Answers & Unlock Stream
app.post('/api/verify', (req, res) => {
    const { userAnswer, expectedAnswer, discordJoined, filename } = req.body;

    if (!discordJoined) return res.status(400).json({ error: 'Please click and join the Discord server first.' });
    if (parseInt(userAnswer, 10) !== parseInt(expectedAnswer, 10)) return res.status(400).json({ error: 'Incorrect equation answer. Try again!' });

    res.json({ downloadUrl: `/api/stream/${encodeURIComponent(filename)}` });
});

// Securely Pipe File Download to User
app.get('/api/stream/:filename', (req, res) => {
    const filename = req.params.filename;
    const targetPath = path.join(uploadDir, filename);

    if (fs.existsSync(targetPath)) {
        res.download(targetPath, filename);
    } else {
        res.status(404).send('Requested script file is missing from the system.');
    }
});

app.listen(PORT, () => {
    console.log(`Cloud Server Online running on port ${PORT}!`);
});
