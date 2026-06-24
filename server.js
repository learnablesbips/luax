const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIGURATION
const ALLOWED_IP = '127.0.0.1'; // Change to your public IP when live
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

// Strict Admin IP Guard Middleware
const requireAdminIP = (req, res, next) => {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp.includes('::ffff:')) clientIp = clientIp.split('::ffff:')[1];

    if (clientIp === ALLOWED_IP || clientIp === '127.0.0.1' || clientIp === '::1') {
        next(); // Always allows local loopback access from the hosting machine
    } else {
        res.status(403).send('Access Denied: You do not have permission to access this page.');
    }
};

// Serve the Admin Dashboard (Protected)
app.get('/admin', requireAdminIP, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin File Upload Processing (Protected)
app.post('/api/upload', requireAdminIP, upload.single('fileToUpload'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    
    // Links will now cleanly display without ":3000"
    const publicLink = `http://localhost/download/${encodeURIComponent(req.file.originalname)}`;
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
        return res.status(404).send('File not found or has been removed.');
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
    console.log(`Server Online on standard web port!`);
    console.log(`Admin Link (Local Machine Control): http://localhost/admin`);
});