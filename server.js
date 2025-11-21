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
const webpush = require('web-push');
const axios = require('axios');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tugasRoutes = require('./router/tugas');

const app = express();
const port = process.env.PORT_SERVER || process.env.PORT; 

const cronTimezone = process.env.TZ || "Asia/Jakarta";

// Jangan di hapus, ini buat contoh webhook discord
// async function sendDiscordWebhook(message) {
//     if (!DISCORD_WEBHOOK_URL) {
//         throw new Error('DISCORD_WEBHOOK_URL belum diatur di .env');
//     }

//     try {
//         await axios.post(DISCORD_WEBHOOK_URL, {
//             content: message
//         });
//         console.log('Pesan webhook Discord terkirim:', message);
//     } catch (error) {
//         console.error('Gagal kirim webhook:', error.response?.data || error.message);
//         throw error;
//     }
// }

if (!port) {
    console.error('error file .env belum ada yang berisi port server.');
    process.exit(1);
}

app.use(express.static(path.join(__dirname, 'views')));


app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.set('json spaces', 2);
app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET || "secret-default",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000,
        httpOnly: false,
    },
}));

const VALID_NPMS = process.env.VALID_NPMS?.split(",") || [];
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login.html");
    }
    next();
}

app.use("/protected", requireLogin, express.static("protected"));



function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
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
                Mandiri: !!body.Mandiri,
                createdBy: req.session.user?.npm
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
                Mandiri: body.Mandiri ?? rows[idx].Mandiri,
                updatedBy: req.session.user?.npm
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
app.post("/login", (req, res) => {
    const { npm } = req.body;

    if (!npm) {
        return res.status(400).json({ success: false, message: "Pin / NPM wajib diisi" });
    }

    const isValid = VALID_NPMS.includes(npm);

    if (!isValid) {
        return res.status(401).json({ success: false, message: "PIN salah / tidak terdaftar" });
    }

    console.log("NPM input:", npm);
    console.log("Valid list:", isValid);

    // Simpan session login
    req.session.user = { npm };
    console.log("User logged in:", req.session.user);

    return res.json({
        success: true,
        message: "Login berhasil",
        redirect: "/tugas-mahasiswa",
    });
});

app.post('/logindosen', (req, res) => {
    const { npm } = req.body;
    const validNPMsDosen = process.env.VALID_NPMS_DOSEN
        ? process.env.VALID_NPMS_DOSEN.split(',').map(s => s.trim()).filter(Boolean)
        : [''];

    if (validNPMsDosen.includes(npm)) {
        req.session.user = { npm, role: "dosen" };
        res.json({ success: true, redirect: '/tugas-dosen' });
    } else {
        res.status(401).json({ success: false, message: 'Pin tidak valid!' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});


app.get("/api/check-session", (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ loggedIn: true, user: req.session.user });
    }
    res.json({ loggedIn: false });
});



// pengaman agar gak langsung masuk ke endpoint tugas-mahasiswa dan tugas-dosen

app.get('/tugas-mahasiswa', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', '/protected/tugas-mhs.html'));
});

app.get('/tugas-dosen', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', '/protected/tugas-dosen.html'));
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


// ==================== PUSH NOTIFICATION WEB SERVICE ====================

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function loadSubs() {
    return await prisma.pushSubscription.findMany();
}
async function saveSub(sub) {
    // sub: { endpoint, keys: { auth, p256dh } }
    try {
        await prisma.pushSubscription.upsert({
            where: { endpoint: sub.endpoint },
            update: {
                keysAuth: sub.keys.auth,
                keysP256dh: sub.keys.p256dh
            },
            create: {
                endpoint: sub.endpoint,
                keysAuth: sub.keys.auth,
                keysP256dh: sub.keys.p256dh
            }
        });
    } catch (e) {
        console.error('gagal save subscribe', e);
    }
}
async function deleteSub(endpoint) {
    try {
        await prisma.pushSubscription.delete({ where: { endpoint } });
    } catch (e) {}
}

// Endpoint untuk menerima subscription dari client
app.post('/subscribe', express.json(), async (req, res) => {
    const sub = req.body;
    if (!sub || !sub.endpoint || !sub.keys) return res.status(400).json({ error: 'Invalid subscription' });
    await saveSub(sub);
    res.status(201).json({ success: true });
});


app.get('/vapidPublicKey', (req, res) => {
    res.json({ key: process.env.VAPID_PUBLIC_KEY });
});
const sendPushReminders = async (type) => {
    const now = new Date();
    let targetDate = new Date();
        if (type === 'H-3') {
        targetDate.setDate(now.getDate() + 3); // H-3 berarti 3 hari dari sekarang
    } else if (type === 'H-1') {
        targetDate.setDate(now.getDate() + 1); // H-1 berarti besok
    } else {
        targetDate.setDate(now.getDate()); // Hari H berarti hari ini
    }

    const ymd = targetDate.toISOString().split('T')[0];
    console.log(`Checking ${type} tasks for date: ${ymd}`);

    const tugas = await prisma.tugasMhs.findMany({
        where: {
            deadline: {
                equals: new Date(ymd)
            }
        }
    });

    console.log(`Found ${tugas.length} tasks for ${type} with deadline ${ymd}`);
    if (tugas.length > 0) {
        console.log('Tasks found:', tugas.map(t => `${t.Namatugas} (${t.deadline})`));
    }

    if (!tugas.length) return;

    let msg = `Ada ${tugas.length} tugas deadline ${type}:\n` +
        tugas.map(t => `• ${t.Namatugas} (${t.matakuliah}) - ${ymd}`).join('\n');

    let subs = await loadSubs();
    for (let sub of subs) {
        try {
            await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    auth: sub.keysAuth,
                    p256dh: sub.keysP256dh
                }
            }, JSON.stringify({
                title: `Reminder Tugas ${type}`,
                body: msg,
                icon: '/img/splash1.png'
            }));
        } catch (e) {
            if (e.statusCode === 410 || e.statusCode === 404) {
                await deleteSub(sub.endpoint);
            }
        }
    }
};




// ==================== SETUP CRON JOBS PUSH WEB NOTIFY ====================
// INI YANG H-1 SAMA H-3
cron.schedule('0 19 * * *', () => {
    const now = new Date();
    console.log('Cron 19:00 triggered at', now.toISOString());
    sendPushReminders('H-3');
    sendPushReminders('H-1');
},{ timezone: cronTimezone });

// INI YANG HARI H tugas
cron.schedule('0 7 * * *', () => {
    const now = new Date();
    console.log('Cron 05:00 triggered at', now.toISOString());
    sendPushReminders('H');
}, { timezone: cronTimezone });


// ngetest push notification
// app.post('/test-push2', async (req, res) => {
//     try {
//         let subs = await loadSubs();
//         if (!subs.length) return res.status(400).json({ error: 'gak ada yang subs notify' });
//         for (let sub of subs) {
//             await webpush.sendNotification({
//                 endpoint: sub.endpoint,
//                 keys: {
//                     auth: sub.keysAuth,
//                     p256dh: sub.keysP256dh
//                 }
//             }, JSON.stringify({
//                 title: 'Test Push',
//                 body: 'Ini test push notifikasi aja.',
//                 icon: '/img/splash1.png'
//             }));
//         }
//         res.json({ success: true });
//     } catch (e) {
//     res.status(500).json({ error: e.message, details: e });    }
// });

// tesh push custom pesan + ada key header
app.post("/test-push", async (req, res) => {
  const clientKey = req.headers["x-api-key"];

  if (clientKey !== process.env.TEST_PUSH_KEY) {
    return res
      .status(403)
      .json({ error: "API key salah atau tidak ada." });
  }

  const { title, body, icon } = req.body;
  if (!title || !body || !icon) {
    return res.status(400).json({ error: "title, body, icon wajib diisi." });
  }

  try {
    const subs = await loadSubs();
    if (!subs.length)
      return res.status(400).json({ error: "Tidak ada subs yang terdaftar." });

    let sentCount = 0;
    for (let sub of subs) {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { auth: sub.keysAuth, p256dh: sub.keysP256dh },
        },
        JSON.stringify({ title, body, icon })
      );
      sentCount++;
    }

    res.json({ success: true, sentTo: sentCount });
  } catch (e) {
    res.status(500).json({ error: e.message || e });
  }
});

// ============= BE push notify on production ===============

app.post("/push-notify", async (req, res) => {
  const clientKey = req.headers["x-api-key-pro"];

  if (clientKey !== process.env.PRODUCTION_PUSH) {
    return res.status(403).json({ error: "API key push production salah atau tidak ada." });
  }

  const { title, body, icon } = req.body;
  if (!title || !body || !icon) {
    return res.status(400).json({ error: "title, body, icon wajib diisi." });
  }

  try {
    const subs = await loadSubs();
    if (!subs.length)
      return res.status(400).json({ error: "Tidak ada subs yang terdaftar." });

    let sentCount = 0;
    for (let sub of subs) {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { auth: sub.keysAuth, p256dh: sub.keysP256dh },
        },
        JSON.stringify({ title, body, icon })
      );
      sentCount++;
    }

    res.json({ success: true, sentTo: sentCount });
  } catch (e) {
    res.status(500).json({ error: e.message || e });
  }
});



// Endpoint untuk unsubscribe
app.post('/unsubscribe', express.json(), async (req, res) => {
    const endpoint = req.body.endpoint;
    if (!endpoint) return res.status(400).json({ error: 'endpoint salah/ tidak ada. (invalid endpoint)' });
    
    try {
        await prisma.pushSubscription.delete({
            where: { endpoint: endpoint }
        });
        res.json({ success: true });
    } catch (e) {
         res.status(500).json({ error: e.message, details: e });
    }
});

// ==================== DISCORD WEBHOOK REMINDER ====================

const sendDiscordWebhook = async (payload) => {
  if (!process.env.DISCORD_WEBHOOK_URL)
    return console.error("DISCORD_WEBHOOK_URL not set in .env");
  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, payload);
    console.log("webhook Discord successfully sent");
  } catch (err) {
    console.error("Discord webhook error:", err.response?.data || err.message);
  }
};

const getKategori = (task) => {
  const categories = [];
  if (task.kelompok) categories.push("Kelompok");
  if (task.vclass) categories.push("VClass");
  if (task.praktikum) categories.push("Praktikum");
  if (task.ilab) categories.push("iLab");
  if (task.Mandiri) categories.push("Mandiri");
  return categories.length > 0 ? categories.join(", ") : "-";
};

// this embed maker -> di ubah di sini kalau mau ganti style ngirim nya
const makeEmbed = (type, tasks) => {
  const map = {
    H3: { color: 0xffd93d, title: "🔔 REMINDER H-3 DEADLINE TUGAS! 🔔" },
    H1: { color: 0xff4d4d, title: "🚨 FINAL REMINDER H-1 DEADLINE TUGAS! 🚨" },
    H: { color: 0x4caf50, title: "✅ HARI-H DEADLINE TUGAS! ✅" },
  };
  const s = map[type];
  if (!s || !tasks || !tasks.length) return null;

  const fields = tasks.map((t) => ({
    name: `${t.matakuliah || "Umum"}`,
    value: `• ${t.Namatugas || "-"}\n• Deadline: ${new Date(
      t.deadline
    ).toLocaleDateString("id-ID")}\n• Kategori: ${getKategori(t)}\n${
      t.UrlGambar ? `• URL: ${t.UrlGambar}\n` : ""
    }`,
    inline: false,
  }));

  return {
    embeds: [
      {
        title: s.title,
        color: s.color,
        fields,
        footer: {
          text: `JANGAN SAMPAI LUPA • ${new Date().toLocaleString("id-ID")}`,
        },
      },
    ],
  };
};

// Kirim reminder berdasarkan jenis H-3, H-1, H
const sendRemindersForType = async (type) => {
  try {
    let target = new Date();
    if (type === "H-3") target.setDate(new Date().getDate() + 3);
    else if (type === "H-1") target.setDate(new Date().getDate() + 1);
    else target = new Date();

    const ymd = target.toISOString().split("T")[0];
    const tugas = await prisma.tugasMhs.findMany({
      where: { deadline: { equals: new Date(ymd) } },
    });

    if (!tugas || !tugas.length)
      return console.log(`no tasks for ${type} ${ymd}`);
    console.log(`found ${tugas.length} tasks for ${type} ${ymd}`);

    const embed = makeEmbed(
      type === "H-3" ? "H3" : type === "H-1" ? "H1" : "H",
      tugas
    );
    if (embed) await sendDiscordWebhook(embed);
  } catch (e) {
    console.error("sendRemindersForType error", e);
  }
};

 // ========== SETUP JAM UNTUK DISCORD WEBHOOK ==========
cron.schedule(
  "0 19 * * *",
  () => {
    console.log("cron 19:00 trigger - H-3 & H-1");
    sendRemindersForType("H-3");
    sendRemindersForType("H-1");
  },
  { timezone: cronTimezone }
);

cron.schedule(
  "0 7 * * *",
  () => {
    console.log("cron 07:00 trigger - Deadline H");
    sendRemindersForType("H");
  },
  { timezone: cronTimezone }
);

// ========== DI MATIKAN SEMENTARA UNTUK PENGUJIAN AJA ==========

// app.post("/test-discord-format", express.json(), async (req, res) => {
//   try {
//     const data = Array.isArray(req.body.data) ? req.body.data : [];
//     const groups = { H3: [], H1: [], H: [] };

//     for (const t of data) {
//       const diff = Math.ceil(
//         (new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24)
//       );
//       if (diff === 3) groups.H3.push(t);
//       else if (diff === 1) groups.H1.push(t);
//       else if (diff === 0) groups.H.push(t);
//     }

//     if (groups.H3.length) await sendDiscordWebhook(makeEmbed("H3", groups.H3));
//     if (groups.H1.length) await sendDiscordWebhook(makeEmbed("H1", groups.H1));
//     if (groups.H.length) await sendDiscordWebhook(makeEmbed("H", groups.H));

//     res.json({
//       ok: true,
//       sent: { H3: groups.H3.length, H1: groups.H1.length, H: groups.H.length },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post("/test-discord", async (req, res) => {
//   try {
//     const { message } = req.body;
//     if (!message)
//       return res
//         .status(400)
//         .json({ error: "pesan nya mana? masukin di body massage" });

//     await sendDiscordWebhook(message);
//     res.json({ success: true, sent: message });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', 'notfound.html'));
});

cronService.start();

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
