const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Add security headers for camera access
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=*');
    next();
});

// Serve static files
app.use(express.static('.'));

// Route for main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
    console.log(`AI Hunter game running on ${HOST}:${PORT}`);
});
