const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeadlines() {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        console.log('mengecek tugas mahasiswa (Prisma)...');
        const deletedMhs = await prisma.tugasMhs.deleteMany({
            where: {
                deadline: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });
        if (deletedMhs.count > 0) {
            console.log(`deleted ${deletedMhs.count} tugas mahasiswa dengan deadline hari ini`);
        } else {
            console.log('gak ada tugas mahasiswa untuk hari ini');
        }

        console.log('mengecek tugas dosen (Prisma)...');
        const deletedDosen = await prisma.tugasDosen.deleteMany({
            where: {
                TanggalMasuk: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });
        if (deletedDosen.count > 0) {
            console.log(`mengahpus ${deletedDosen.count} tugas dosen dengan TanggalMasuk hari ini`);
        } else {
            console.log('gak ada tugas dosen untuk hari ini');
        }
    } catch (error) {
        console.error('error di (Prisma):', error);
    }
}

const scheduledTask = cron.schedule(
  "0 23 * * *",
  () => {
    console.log("menjalakan hapus otomatis (Prisma)...");
    checkDeadlines();
  },
  {
    timezone: "Asia/Jakarta",
  }
);

//cek log timezone server
console.log(
  "Local time (WIB):",
  new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
);
console.log("Current time:", new Date());

scheduledTask.start();

process.on('SIGINT', async () => {
    try {
        await prisma.$disconnect();
    } finally {
        process.exit(0);
    }
});

module.exports = scheduledTask;
