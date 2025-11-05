require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');
const cronService = require('./services/cronService');
const session = require('express-session');
const fs = require('fs');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tugasRoutes = require('./router/tugas');

const app = express();
const port = process.env.PORT_SERVER || process.env.PORT; 

if (!port) {
    console.error('error file .env belum ada yang berisi pport server.');
    process.exit(1);
}

app.use(express.static(path.join(__dirname, 'views')));


app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.set('json spaces', 2);
app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));



function isAuthenticated(req, res, next) {
    if (req.session && req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
}


app.use(morgan('dev'));
app.use(express.static('public'));
app.use('/views', express.static(path.join(__dirname, 'views')));

app.get('/tugas/mahasiswa', async (req, res) => {
    try {
        const rows = await prisma.tugasMhs.findMany({ orderBy: { deadline: 'asc' } });
        const result = rows.map(r => ({
            ...r,
            deadline: r.deadline ? (new Date(r.deadline)).toISOString().split('T')[0] : null
        }));
        return res.json(result);
    } catch (err) {
        console.error('Error fetching mahasiswa tasks:', err);
        return res.status(500).json([]);
    }
});

app.get('/tugas/dosen', async (req, res) => {
    try {
        const rows = await prisma.tugasDosen.findMany({ orderBy: { TanggalMasuk: 'asc' } });
        const result = rows.map(r => ({
            ...r,
            TanggalMasuk: r.TanggalMasuk ? (new Date(r.TanggalMasuk)).toISOString().split('T')[0] : null
        }));
        return res.json(result);
    } catch (err) {
        console.error('Error fetching dosen tasks:', err);
        return res.status(500).json([]);
    }
});
app.post('/tugas/mahasiswa', async (req, res) => {
    try {
        const body = req.body || {};
        const created = await prisma.tugasMhs.create({
            data: {
                matakuliah: body.matakuliah || '',
                Namatugas: body.Namatugas || '',
                UrlGambar: body.UrlGambar || null,
                deadline: body.deadline ? new Date(body.deadline) : null,
                kelompok: !!body.kelompok,
                vclass: !!body.vclass,
                praktikum: !!body.praktikum,
                ilab: !!body.ilab,
                Mandiri: !!body.Mandiri
            }
        });
        return res.status(201).json({
            ...created,
            deadline: created.deadline ? (new Date(created.deadline)).toISOString().split('T')[0] : null
        });
    } catch (err) {
        console.error('Error creating mahasiswa task:', err);
        return res.status(500).json({ error: 'Failed to create task' });
    }
});
app.put('/tugas/mahasiswa/:index', async (req, res) => {
    try {
        const idx = parseInt(req.params.index, 10);
        const rows = await prisma.tugasMhs.findMany({ orderBy: { deadline: 'asc' } });
        if (isNaN(idx) || idx < 0 || idx >= rows.length) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const id = rows[idx].id;
        const body = req.body || {};
        const updated = await prisma.tugasMhs.update({
            where: { id },
            data: {
                matakuliah: body.matakuliah ?? rows[idx].matakuliah,
                Namatugas: body.Namatugas ?? rows[idx].Namatugas,
                UrlGambar: body.UrlGambar ?? rows[idx].UrlGambar,
                deadline: body.deadline ? new Date(body.deadline) : rows[idx].deadline,
                kelompok: body.kelompok ?? rows[idx].kelompok,
                vclass: body.vclass ?? rows[idx].vclass,
                praktikum: body.praktikum ?? rows[idx].praktikum,
                ilab: body.ilab ?? rows[idx].ilab,
                Mandiri: body.Mandiri ?? rows[idx].Mandiri
            }
        });
        return res.json({
            ...updated,
            deadline: updated.deadline ? (new Date(updated.deadline)).toISOString().split('T')[0] : null
        });
    } catch (err) {
        console.error('Error updating mahasiswa task:', err);
        return res.status(500).json({ error: 'Failed to update task' });
    }
});
app.delete('/tugas/mahasiswa/:index', async (req, res) => {
    try {
        const idx = parseInt(req.params.index, 10);
        const rows = await prisma.tugasMhs.findMany({ orderBy: { deadline: 'asc' } });
        if (isNaN(idx) || idx < 0 || idx >= rows.length) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const id = rows[idx].id;
        await prisma.tugasMhs.delete({ where: { id } });
        return res.status(204).send();
    } catch (err) {
        console.error('Error deleting mahasiswa task:', err);
        return res.status(500).json({ error: 'Failed to delete task' });
    }
});
app.post('/tugas/dosen', async (req, res) => {
    try {
        const body = req.body || {};
        const created = await prisma.tugasDosen.create({
            data: {
                matakuliah: body.matakuliah || '',
                TanggalMasuk: body.TanggalMasuk ? new Date(body.TanggalMasuk) : null,
                Kelas: body.Kelas || '',
                Jam: body.Jam || '',
                LinkGmeet: body.LinkGmeet || null,
                vclass: !!body.vclass,
                Gmeet: !!body.Gmeet,
                offline: !!body.offline
            }
        });
        return res.status(201).json({
            ...created,
            TanggalMasuk: created.TanggalMasuk ? (new Date(created.TanggalMasuk)).toISOString().split('T')[0] : null
        });
    } catch (err) {
        console.error('Error creating dosen task:', err);
        return res.status(500).json({ error: 'Failed to create task' });
    }
});
app.put('/tugas/dosen/:index', async (req, res) => {
    try {
        const idx = parseInt(req.params.index, 10);
        const rows = await prisma.tugasDosen.findMany({ orderBy: { TanggalMasuk: 'asc' } });
        if (isNaN(idx) || idx < 0 || idx >= rows.length) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const id = rows[idx].id;
        const body = req.body || {};
        const updated = await prisma.tugasDosen.update({
            where: { id },
            data: {
                matakuliah: body.matakuliah ?? rows[idx].matakuliah,
                TanggalMasuk: body.TanggalMasuk ? new Date(body.TanggalMasuk) : rows[idx].TanggalMasuk,
                Kelas: body.Kelas ?? rows[idx].Kelas,
                Jam: body.Jam ?? rows[idx].Jam,
                LinkGmeet: body.LinkGmeet ?? rows[idx].LinkGmeet,
                vclass: body.vclass ?? rows[idx].vclass,
                Gmeet: body.Gmeet ?? rows[idx].Gmeet,
                offline: body.offline ?? rows[idx].offline
            }
        });
        return res.json({
            ...updated,
            TanggalMasuk: updated.TanggalMasuk ? (new Date(updated.TanggalMasuk)).toISOString().split('T')[0] : null
        });
    } catch (err) {
        console.error('Error updating dosen task:', err);
        return res.status(500).json({ error: 'Failed to update task' });
    }
});

app.delete('/tugas/dosen/:index', async (req, res) => {
    try {
        const idx = parseInt(req.params.index, 10);
        const rows = await prisma.tugasDosen.findMany({ orderBy: { TanggalMasuk: 'asc' } });
        if (isNaN(idx) || idx < 0 || idx >= rows.length) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const id = rows[idx].id;
        await prisma.tugasDosen.delete({ where: { id } });
        return res.status(204).send();
    } catch (err) {
        console.error('Error deleting dosen task:', err);
        return res.status(500).json({ error: 'Failed to delete task' });
    }
});

app.use('/tugas', (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(body) {
        try {
            if (body && typeof body === 'object' && Array.isArray(body.tugas)) {
                return originalJson(body.tugas);
            }
        } catch (e) {
            // fall back to original
        }
        return originalJson(body);
    };
    next();
}, tugasRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/logindosen', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'logindosen.html'));
});
app.post('/login', (req, res) => {
    const { npm } = req.body;
    const validNPMs = process.env.VALID_NPMS
        ? process.env.VALID_NPMS.split(',').map(s => s.trim()).filter(Boolean)
        : [''];

    if (validNPMs.includes(npm)) {
        req.session.isLoggedIn = true;
        res.json({ success: true, redirect: '/tugas-mahasiswa' });
    } else {
        res.status(401).json({ success: false, message: 'Pin tidak valid!' });
    }
});

app.post('/logindosen', (req, res) => {
    const { npm } = req.body;
    const validNPMsDosen = process.env.VALID_NPMS_DOSEN
        ? process.env.VALID_NPMS_DOSEN.split(',').map(s => s.trim()).filter(Boolean)
        : [''];

    if (validNPMsDosen.includes(npm)) {
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




app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', 'notfound.html'));
});

cronService.start();

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
