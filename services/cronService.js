const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

const dbPathMhs = path.join(__dirname, '../database/tugas-mhs.json');
const dbPathDosen = path.join(__dirname, '../database/status-dosen.json');

// Fungsi ini buat cek jadwal mana yang hari ini masuk deadline
async function checkDeadlines() {
    const today = new Date().toISOString().split('T')[0];

    // funsgi cek jadwal mahasiswa dari json tugas-mhs.json
    try {
        console.log('Checking mahasiswa tasks...');
        const mhsData = JSON.parse(await fs.readFile(dbPathMhs, 'utf8'));
        const mhsFiltered = {
      //filter nya -> gak usah ngide di ganti ganti
            tugas: mhsData.tugas.filter(task => task.deadline !== today)
        };
        
        if (mhsData.tugas.length !== mhsFiltered.tugas.length) {
            await fs.writeFile(dbPathMhs, JSON.stringify(mhsFiltered, null, 2));
            console.log('deadline tugas mahasiswa di delete');
        } else {
            console.log('deadline mahasiswa tidak ada');
        }
    //kasih catch error ke log biar kebaca di server
    } catch (error) {
        console.error('error pas cek tugas:', error);
    }

    // funsgi cek jadwal dosen dari status-dosenn.json
    try {
        console.log('Checking dosen tasks...');
        const dosenData = JSON.parse(await fs.readFile(dbPathDosen, 'utf8'));
        const dosenFiltered = {
      //ini juga gak usah ngide di hapus/ ganti gua fixit ke != today aja biar hari H
            tugas: dosenData.tugas.filter(task => task.TanggalMasuk !== today) 
        };
        
        if (dosenData.tugas.length !== dosenFiltered.tugas.length) {
            await fs.writeFile(dbPathDosen, JSON.stringify(dosenFiltered, null, 2));
            console.log('deadline tugas dosen di delete');
        } else {
            console.log('deadline dosen tidak ada');
        }
    } catch (error) {
        console.error('error pas cek database:', error);
    }
}

//const VarJson 

// jalan jam 23:00 buat delete nya di hari H
const scheduledTask = cron.schedule('00 23 * * *', () => {
    console.log('menjalakan hapus otomatis...');
    checkDeadlines();
});

// Corn memulai task nya
scheduledTask.start();
checkDeadlines();


//di exports ke 
module.exports = scheduledTask;
