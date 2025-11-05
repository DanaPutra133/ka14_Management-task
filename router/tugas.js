const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../database/tugas-mhs.json');
const dbPathDosen = path.join(__dirname, '../database/status-dosen.json');

router.get('/mahasiswa', async (req, res) => {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Error Membaca Data! jangan di spam!' });
    }
});

router.post('/mahasiswa', async (req, res) => {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        const json = JSON.parse(data);
        json.tugas.push(req.body);

        json.tugas.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        await fs.writeFile(dbPath, JSON.stringify(json, null, 2));
        res.json({ message: 'Tugas Berhasil Di Update' });
    } catch (error) {
        res.status(500).json({ error: 'Error Menyimpan Tugas!\nHubungi Dev -dana' });
    }
});

router.delete('/mahasiswa/:index', async (req, res) => {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        const json = JSON.parse(data);
        json.tugas.splice(req.params.index, 1);
        await fs.writeFile(dbPath, JSON.stringify(json, null, 2));
        res.json({ message: 'Data Berhasil Di Hapus' });
    } catch (error) {
        res.status(500).json({ error: 'Error Menghapus Tugas!\nHubungi Dev -dana' });
    }
});

router.put('/mahasiswa/:index', async (req, res) => {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        const json = JSON.parse(data);
        json.tugas[req.params.index] = req.body;
        json.tugas.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        await fs.writeFile(dbPath, JSON.stringify(json, null, 2));
        res.json({ message: 'Tugas Berhasil DI Update!' });
    } catch (error) {
        res.status(500).json({ error: 'Error Update Tugas!\nHubungi Dev -dana' });
    }
});


router.get('/dosen', async (req, res) => {
    try {
        const data = await fs.readFile(dbPathDosen, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Error Membaca Data/ Jangan di spam!' });
    }
});

router.post('/dosen', async (req, res) => {
    try {
        const data = await fs.readFile(dbPathDosen, 'utf8');
        const json = JSON.parse(data);
        json.tugas.push(req.body);
        json.tugas.sort((a, b) => new Date(a.TanggalMasuk) - new Date(b.TanggalMasuk));
        await fs.writeFile(dbPathDosen, JSON.stringify(json, null, 2));
        res.json({ message: 'Status Berhasil Di Simpan' });
    } catch (error) {
        res.status(500).json({ error: 'Error Menyimpan Data' });
    }
});

router.delete('/dosen/:index', async (req, res) => {
    try {
        const data = await fs.readFile(dbPathDosen, 'utf8');
        const json = JSON.parse(data);
        json.tugas.splice(req.params.index, 1);
        await fs.writeFile(dbPathDosen, JSON.stringify(json, null, 2));
        res.json({ message: 'Status Berhasil Di Hapus' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal Menghapus Data' });
    }
}
);

router.put('/dosen/:index', async (req, res) => {
    try {
        const data = await fs.readFile(dbPathDosen, 'utf8');
        const json = JSON.parse(data);
        json.tugas[req.params.index] = req.body;
        json.tugas.sort((a, b) => new Date(a.TanggalMasuk) - new Date(b.TanggalMasuk));
        await fs.writeFile(dbPathDosen, JSON.stringify(json, null, 2));
        res.json({ message: 'Status Berhasil Di Update' });
    } catch (error) {
        res.status(500).json({ error: 'Error update Status! Hubungi owner -dana' });
    }
}
);
router.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../views', 'notfound.html'));
});


module.exports = router;
