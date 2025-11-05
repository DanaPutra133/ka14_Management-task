const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');
const cronService = require('./services/cronService');
const session = require('express-session');
const fs = require('fs');

const tugasRoutes = require('./router/tugas');

const app = express();
const port = process.env.PORT || 3000;


app.use(express.static(path.join(__dirname, 'views')));


app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.set('json spaces', 2);
app.set('trust proxy', 1);

// Configure session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));


//statistik rpg

function isAuthenticated(req, res, next) {
    if (req.session && req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
}

app.use('/api', (req, res, next) => {
    const logs = readLogs();
    const logEntry = {
        timestamp: Date.now(),
        method: req.method,
        path: req.originalUrl,
        status: null
    };


    res.on('finish', () => {
        logEntry.status = res.statusCode;
        logs.push(logEntry);
        writeLogs(logs);
    });

    next();
});

// Logs API requests
app.use(morgan('dev'));

// Serve static files
app.use(express.static('public'));

// Serve static files from views directory
app.use('/views', express.static(path.join(__dirname, 'views')));

// API routes
app.use('/tugas', tugasRoutes);  // Add tugas routes

// Root routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/logindosen', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'logindosen.html'));
});

// Handle untuk login user
app.post('/login', (req, res) => {
    const { npm } = req.body;
    // isi npm untuk login nya
    const validNPMs = [
        '10123023', '10123089', '10123169', '10123211', '10123215', 
        '10123244', '10123281', '10123290', '10123364', '10123786', 
        '10123931', '10123946', '11123025', '11123148', '11123082', 
        '11123285', '10123140'
    ]; 

    if (validNPMs.includes(npm)) {
        req.session.isLoggedIn = true;
        res.json({ success: true, redirect: '/tugas-mahasiswa' });
    } else {
        res.status(401).json({ success: false, message: 'Pin tidak valid!' });
    }
});

app.post('/logindosen', (req, res) => {
    const { npm } = req.body;
    // isi npm untuk login nya
    const validNPMs = [
        '10123023', '10123089', '10123169', '10123211', '10123215', 
        '10123244', '10123281', '10123290', '10123364', '10123786', 
        '10123931', '10123946', '11123025', '11123148', '11123082', 
        '11123285'
    ]; 

    if (validNPMs.includes(npm)) {
        req.session.isLoggedIn = true;
        res.json({ success: true, redirect: '/tugas-dosen' });
    } else {
        res.status(401).json({ success: false, message: 'Pin tidak valid!' });
    }
});

// pengaman agar gak langsung masuk ke endpoint tugas-mahasiswa dan tugas-dosen

app.get('/tugas-mahasiswa', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tugas-mhs.html'));
});

app.get('/tugas-dosen', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tugas-dosen.html'));
});

// const getJKalenderAkademik = require('./scrapers/BAAK_Kalender');
// app.get('/baakkalender', isAuthenticated, async (req, res) => {
//     try {
//         const data = await getJKalenderAkademik();
//         res.json({
//             status: true,
//             message: "Success",
//             data
//         });
//     } catch (error) {
//         res.status(500).json({
//             status: false,
//             message: 'kalender tidak ditemukan',
//             error: error.message
//         });
//     }
// });




app.use('/table-dosen', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'table-dosen.html'));
});

app.use('/table-mhs', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'table-mhs.html'));
});

app.use('/kalenderTugas', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'kalenderTugas.html'));
});



// Scraper game endpoints
// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', 'notfound.html'));
});



// Start cron service
cronService.start();

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
