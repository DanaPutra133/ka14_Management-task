const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeadlines() {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        console.log('Checking mahasiswa tasks (Prisma)...');
        const deletedMhs = await prisma.tugasMhs.deleteMany({
            where: {
                deadline: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });
        if (deletedMhs.count > 0) {
            console.log(`deleted ${deletedMhs.count} mahasiswa task(s) with today deadline`);
        } else {
            console.log('no mahasiswa deadlines for today');
        }

        console.log('Checking dosen tasks (Prisma)...');
        const deletedDosen = await prisma.tugasDosen.deleteMany({
            where: {
                TanggalMasuk: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });
        if (deletedDosen.count > 0) {
            console.log(`deleted ${deletedDosen.count} dosen task(s) with today TanggalMasuk`);
        } else {
            console.log('no dosen deadlines for today');
        }
    } catch (error) {
        console.error('error checking deadlines (Prisma):', error);
    }
}

// jalan jam 23:00 buat delete nya di hari H
const scheduledTask = cron.schedule('0 23 * * *', () => {
    console.log('menjalakan hapus otomatis (Prisma)...');
    checkDeadlines();
});

// Corn memulai task nya
scheduledTask.start();
checkDeadlines();

process.on('SIGINT', async () => {
    try {
        await prisma.$disconnect();
    } finally {
        process.exit(0);
    }
});

module.exports = scheduledTask;
