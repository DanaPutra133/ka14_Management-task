require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');
const cronService = require('./services/cronService');
const session = require('express-session');


const webpush = require('web-push');
const axios = require('axios');


const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


const multer = require("multer");
const FormData = require("form-data");
const upload = multer({ storage: multer.memoryStorage() });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// const tugasRoutes = require('./router/tugas');

const app = express();

// environment variables
const port = process.env.PORT_SERVER || process.env.PORT; 
const ADMIN_PIN = process.env.ADMIN_PIN;
const JWT_SECRET = process.env.JWT_SECRET;
const VALID_NPMS = process.env.VALID_NPMS


  ? process.env.VALID_NPMS.split(",").map((s) => s.trim())
  : [];
const cronTimezone = process.env.TZ || "Asia/Jakarta";

const verifyAdmin = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; 

  if (!token)
    return res.status(403).json({ error: "Akses ditolak. Token tidak ada." });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res
        .status(401)
        .json({ error: "Token tidak valid atau kadaluwarsa." });
    req.userAdmin = decoded;
    next();
  });
};

const verifyEditorOrAdmin = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (token) {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || "default-jwt-secret",
      (err, decoded) => {
        if (err) return res.status(401).json({ error: "Token tidak valid." });
        req.actor = { type: "admin", id: "Super Admin" };
        next();
      }
    );
  }
  if (req.session && req.session.user && req.session.user.isEditor) {
    req.actor = { type: "mahasiswa", id: req.session.user.npm };
    return next();
  }
  return res
    .status(403)
    .json({ error: "Akses ditolak. Anda bukan Editor atau Admin." });
};

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
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret-default",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000,
      httpOnly: false,
    },
  })
);



app.use(morgan('dev'));
app.use(express.static('public'));
app.use('/views', express.static(path.join(__dirname, 'views')));

// ==================== SERVICE UPLOADER PROXY ====================
app.post('/upload-proxy', verifyEditorOrAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diupload' });
        const form = new FormData();
        form.append('image', req.file.buffer, req.file.originalname);
        const targetUrl = `${process.env.UPLOADER_URL}?apikey=${process.env.UPLOADER_APIKEY}`;
        const response = await axios.post(targetUrl, form, {
            headers: {
                ...form.getHeaders()
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Upload Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Gagal mengupload gambar ke server luar.' });
    }
});

// ==================== ADMIN ROUTES ====================

app.post('/api/admin/login', (req, res) => {
    const { pin } = req.body;
    
    if (pin !== ADMIN_PIN) {
        return res.status(401).json({ success: false, message: 'PIN Admin salah!' });
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ 
        success: true, 
        token: token,

    });
});

app.post('/api/admin/push/broadcast', verifyAdmin, async (req, res) => {
    const { title, body } = req.body;
    
    if (!title || !body) return res.status(400).json({ error: 'Judul dan Isi pesan wajib diisi.' });

    try {
        const subs = await prisma.pushSubscription.findMany(); 
        if (subs.length === 0) return res.json({ message: 'Tidak ada subscriber.' });

        const promises = subs.map(sub => 
            webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { auth: sub.keysAuth, p256dh: sub.keysP256dh }
            }, JSON.stringify({
                title: title,
                body: body,
                icon: '/img/splash1.png'
            })).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(()=>{});
                }
            })
        );

        await Promise.all(promises);
        res.json({ success: true, message: `Notifikasi dikirim ke ${subs.length} user.` });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/discord/custom', verifyAdmin, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Pesan wajib diisi' });

    try {
        await axios.post(process.env.DISCORD_WEBHOOK_URL, { content: message });
        res.json({ success: true, message: 'Pesan Discord terkirim.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});
app.get("/api/admin/users/pending", verifyAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: false },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/users/approve", verifyAdmin, async (req, res) => {
  const { npm, action } = req.body; 

  try {
    if (action === "reject") {
      await prisma.user.delete({ where: { npm } });
      return res.json({
        success: true,
        message: `User ${npm} ditolak & dihapus.`,
      });
    }

    await prisma.user.update({
      where: { npm },
      data: { isApproved: true },
    });
    res.json({ success: true, message: `User ${npm} berhasil di approve!` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const requireStudent = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "mahasiswa") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

app.get("/api/admin/users", verifyAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        taskProgress: true, 
      },
      orderBy: { npm: "asc" },
    });

    const totalTugas = await prisma.tugasMhs.count();

    const data = users.map((u) => {
      const completedCount = u.taskProgress.filter((t) => t.isCompleted).length;
      return {
        npm: u.npm,
        email: u.email,
        isApproved: u.isApproved,
        isEditor: u.isEditor,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        progress: `${completedCount} / ${totalTugas}`, 
        progressPercent:
          totalTugas > 0 ? Math.round((completedCount / totalTugas) * 100) : 0,
      };
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/users/:npm", verifyAdmin, async (req, res) => {
  try {
    const { npm } = req.params;
    const user = await prisma.user.findUnique({
      where: { npm },
      include: { taskProgress: { include: { tugas: true } } }, 
    });

    if (!user) return res.status(404).json({ error: "User tidak ditemukan!" });

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/users/:npm", verifyAdmin, async (req, res) => {
  try {
    const { npm } = req.params;
    await prisma.user.delete({ where: { npm } });
    res.json({ success: true, message: "User berhasil dihapus permanent." });
  } catch (e) {
    res.status(500).json({ error: "Gagal hapus user" });
  }
});

app.post("/api/admin/users/reset-pin", verifyAdmin, async (req, res) => {
  const { npm, newPin } = req.body;
  try {
    const hashedPin = await bcrypt.hash(newPin, 10);
    await prisma.user.update({
      where: { npm },
      data: { pin: hashedPin },
    });
    res.json({ success: true, message: "PIN User berhasil direset." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/users/toggle-editor", verifyAdmin, async (req, res) => {
  const { npm, isEditor } = req.body;
  try {
    await prisma.user.update({
      where: { npm },
      data: { isEditor: isEditor },
    });
    res.json({
      success: true,
      message: `Status Editor user ${npm} diubah jadi ${isEditor}`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/admin-users", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin-users.html"));
});


// =================== MAHASISWA ROUTES ====================

app.post("/auth/check-npm", async (req, res) => {
  const { npm } = req.body;

  if (!VALID_NPMS.includes(npm)) {
    return res.json({
      status: "INVALID",
      message: "NPM tidak terdaftar di kelas ini.",
    });
  }

  const user = await prisma.user.findUnique({ where: { npm } });

  if (!user) {
    return res.json({
      status: "UNREGISTERED",
      message: "Silakan Registrasi PIN & Email.",
    });
  }

  return res.json({ status: "REGISTERED", message: "Masukkan PIN Anda." });
});

app.post("/auth/register", async (req, res) => {
  const { npm, pin, email } = req.body;

  if (!VALID_NPMS.includes(npm))
    return res.status(403).json({ error: "NPM Ilegal / Tidak Terdaftar" });
  if (!pin || !email)
    return res.status(400).json({ error: "Data tidak lengkap" });
  if (pin === npm) {
    return res
      .status(400)
      .json({
        error: "PIN tidak boleh sama dengan NPM Anda! Gunakan kombinasi lain.",
      });
  }
  if (VALID_NPMS.includes(pin)) {
    return res
      .status(400)
      .json({
        error:
          "Dilarang menggunakan NPM sebagai PIN! Harap buat PIN angka yang unik.",
      });
  }

  if (pin.length < 6) {
    return res.status(400).json({ error: "PIN minimal 6 karakter." });
  }
  const exist = await prisma.user.findUnique({ where: { npm } });
  if (exist) return res.status(400).json({ error: "NPM sudah terdaftar." });
  const hashedPin = await bcrypt.hash(pin, 10);

  try {
    await prisma.user.create({
      data: {
        npm,
        pin: hashedPin,
        email,
        isApproved: false, 
      },
    });
    res.json({
      success: true,
      message: "Registrasi Berhasil! Tunggu persetujuan Admin.",
    });
  } catch (e) {
    res.status(500).json({ error: "Gagal registrasi db" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { npm, pin } = req.body;

  const user = await prisma.user.findUnique({ where: { npm } });
  if (!user)
    return res
      .status(404)
      .json({ success: false, message: "User tidak ditemukan" });

  const isMatch = await bcrypt.compare(pin, user.pin);
  if (!isMatch)
    return res.status(401).json({ success: false, message: "PIN Salah!" });

  if (!user.isApproved) {
    return res
      .status(403)
      .json({ success: false, message: "Akun belum disetujui Admin, Hubungi Dana!" });
  }

  await prisma.user.update({
    where: { npm: user.npm },
    data: { lastLogin: new Date() },
  });

  req.session.user = {
    npm: user.npm,
    role: "mahasiswa",
    isEditor: user.isEditor,
  };

  res.json({
    success: true,
    message: "Login Berhasil",
    redirect: "/dashboard-user", 
  });
});



app.get("/editor-tugas.html", (req, res) => {
  if (req.session.user && req.session.user.isEditor) {
    res.sendFile(path.join(__dirname, "views", "editor-tugas.html"));
  } else {
    res.redirect("/dashboard-user");
  }
});
app.get("/api/student/dashboard", requireStudent, async (req, res) => {
  const userNpm = req.session.user.npm;

  try {
    const tasks = await prisma.tugasMhs.findMany({
      orderBy: { deadline: "asc" },
    });

    const progress = await prisma.userTaskProgress.findMany({
      where: { userNpm: userNpm },
    });

    const result = tasks.map((task) => {
      const prog = progress.find((p) => p.tugasId === task.id);
      return {
        ...task,
        isCompleted: prog ? prog.isCompleted : false,
        catatan: prog ? prog.catatan : "",
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/student/toggle-task", requireStudent, async (req, res) => {
  const { tugasId, isCompleted } = req.body;
  const userNpm = req.session.user.npm;

  try {
    await prisma.userTaskProgress.upsert({
      where: {
        userNpm_tugasId: { userNpm, tugasId: parseInt(tugasId) },
      },
      update: { isCompleted },
      create: {
        userNpm,
        tugasId: parseInt(tugasId),
        isCompleted,
      },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Gagal update status" });
  }
});

app.post("/api/student/save-note", requireStudent, async (req, res) => {
  const { tugasId, note } = req.body;
  const userNpm = req.session.user.npm;

  try {
    await prisma.userTaskProgress.upsert({
      where: {
        userNpm_tugasId: { userNpm, tugasId: parseInt(tugasId) },
      },
      update: { catatan: note },
      create: {
        userNpm,
        tugasId: parseInt(tugasId),
        catatan: note,
      },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Gagal simpan catatan" });
  }
});































// ==================== END ADMIN ROUTES ====================
app.get("/dashboard-user", requireStudent, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});


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

// app.get('/tugas/dosen', async (req, res) => {
//     try {
//         const rows = await prisma.tugasDosen.findMany({ orderBy: { TanggalMasuk: 'asc' } });
//         const result = rows.map(r => ({
//             ...r,
//             TanggalMasuk: r.TanggalMasuk ? (new Date(r.TanggalMasuk)).toISOString().split('T')[0] : null
//         }));
//         return res.json(result);
//     } catch (err) {
//         console.error('Error fetching dosen tasks:', err);
//         return res.status(500).json([]);
//     }
// });
app.post('/tugas/mahasiswa', verifyEditorOrAdmin, async (req, res) => {
    try {
        const body = req.body || {};
        const created = await prisma.tugasMhs.create({
          data: {
            matakuliah: body.matakuliah || "",
            Namatugas: body.Namatugas || "",
            UrlGambar: body.UrlGambar || null,
            deadline: body.deadline ? new Date(body.deadline) : null,
            Noted: body.Noted || "-",
            kelompok: !!body.kelompok,
            vclass: !!body.vclass,
            praktikum: !!body.praktikum,
            ilab: !!body.ilab,
            Mandiri: !!body.Mandiri,
            createdBy: req.actor.id,
          },
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
app.put('/tugas/mahasiswa/:index',  verifyEditorOrAdmin, async (req, res) => {
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
            Noted: body.Noted || "-",
            deadline: body.deadline
              ? new Date(body.deadline)
              : rows[idx].deadline,
            kelompok: body.kelompok ?? rows[idx].kelompok,
            vclass: body.vclass ?? rows[idx].vclass,
            praktikum: body.praktikum ?? rows[idx].praktikum,
            ilab: body.ilab ?? rows[idx].ilab,
            Mandiri: body.Mandiri ?? rows[idx].Mandiri,
            updatedBy: req.actor.id,
          },
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
app.delete('/tugas/mahasiswa/:index', verifyEditorOrAdmin, async (req, res) => {
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
// app.post('/tugas/dosen', async (req, res) => {
//     try {
//         const body = req.body || {};
//         const created = await prisma.tugasDosen.create({
//             data: {
//                 matakuliah: body.matakuliah || '',
//                 TanggalMasuk: body.TanggalMasuk ? new Date(body.TanggalMasuk) : null,
//                 Kelas: body.Kelas || '',
//                 Jam: body.Jam || '',
//                 LinkGmeet: body.LinkGmeet || null,
//                 vclass: !!body.vclass,
//                 Gmeet: !!body.Gmeet,
//                 offline: !!body.offline
//             }
//         });
//         return res.status(201).json({
//             ...created,
//             TanggalMasuk: created.TanggalMasuk ? (new Date(created.TanggalMasuk)).toISOString().split('T')[0] : null
//         });
//     } catch (err) {
//         console.error('Error creating dosen task:', err);
//         return res.status(500).json({ error: 'Failed to create task' });
//     }
// });
// app.put('/tugas/dosen/:index', async (req, res) => {
//     try {
//         const idx = parseInt(req.params.index, 10);
//         const rows = await prisma.tugasDosen.findMany({ orderBy: { TanggalMasuk: 'asc' } });
//         if (isNaN(idx) || idx < 0 || idx >= rows.length) {
//             return res.status(404).json({ error: 'Task not found' });
//         }
//         const id = rows[idx].id;
//         const body = req.body || {};
//         const updated = await prisma.tugasDosen.update({
//             where: { id },
//             data: {
//                 matakuliah: body.matakuliah ?? rows[idx].matakuliah,
//                 TanggalMasuk: body.TanggalMasuk ? new Date(body.TanggalMasuk) : rows[idx].TanggalMasuk,
//                 Kelas: body.Kelas ?? rows[idx].Kelas,
//                 Jam: body.Jam ?? rows[idx].Jam,
//                 LinkGmeet: body.LinkGmeet ?? rows[idx].LinkGmeet,
//                 vclass: body.vclass ?? rows[idx].vclass,
//                 Gmeet: body.Gmeet ?? rows[idx].Gmeet,
//                 offline: body.offline ?? rows[idx].offline
//             }
//         });
//         return res.json({
//             ...updated,
//             TanggalMasuk: updated.TanggalMasuk ? (new Date(updated.TanggalMasuk)).toISOString().split('T')[0] : null
//         });
//     } catch (err) {
//         console.error('Error updating dosen task:', err);
//         return res.status(500).json({ error: 'Failed to update task' });
//     }
// });

// app.delete('/tugas/dosen/:index', async (req, res) => {
//     try {
//         const idx = parseInt(req.params.index, 10);
//         const rows = await prisma.tugasDosen.findMany({ orderBy: { TanggalMasuk: 'asc' } });
//         if (isNaN(idx) || idx < 0 || idx >= rows.length) {
//             return res.status(404).json({ error: 'Task not found' });
//         }
//         const id = rows[idx].id;
//         await prisma.tugasDosen.delete({ where: { id } });
//         return res.status(204).send();
//     } catch (err) {
//         console.error('Error deleting dosen task:', err);
//         return res.status(500).json({ error: 'Failed to delete task' });
//     }
// });

// app.use('/tugas', (req, res, next) => {
//     const originalJson = res.json.bind(res);
//     res.json = function(body) {
//         try {
//             if (body && typeof body === 'object' && Array.isArray(body.tugas)) {
//                 return originalJson(body.tugas);
//             }
//         } catch (e) {
//         }
//         return originalJson(body);
//     };
//     next();
// }, tugasRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login-mahasiswa', (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login-mahasiswa.html"));
});

// app.get('/logindosen', (req, res) => {
//     res.sendFile(path.join(__dirname, 'views', 'logindosen.html'));
// });

// app.post("/login", (req, res) => {
//     const { npm } = req.body;

//     if (!npm) {
//         return res.status(400).json({ success: false, message: "Pin / NPM wajib diisi" });
//     }

//     const isValid = VALID_NPMS.includes(npm);

//     if (!isValid) {
//         return res.status(401).json({ success: false, message: "PIN salah / tidak terdaftar" });
//     }

//     console.log("NPM input:", npm);
//     console.log("Valid list:", isValid);
//     req.session.user = { npm };
//     console.log("User logged in:", req.session.user);

//     return res.json({
//         success: true,
//         message: "Login berhasil",
//         redirect: "/tugas-mahasiswa",
//     });
// });

// app.post('/logindosen', (req, res) => {
//     const { npm } = req.body;
//     const validNPMsDosen = process.env.VALID_NPMS_DOSEN
//         ? process.env.VALID_NPMS_DOSEN.split(',').map(s => s.trim()).filter(Boolean)
//         : [''];

//     if (validNPMsDosen.includes(npm)) {
//         req.session.user = { npm, role: "dosen" };
//         res.json({ success: true, redirect: '/tugas-dosen' });
//     } else {
//         res.status(401).json({ success: false, message: 'Pin tidak valid!' });
//     }
// });

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

// app.get('/tugas-mahasiswa', (req, res) => {
//     res.sendFile(path.join(__dirname, 'views', '/protected/tugas-mhs.html'));
// });

// app.get('/tugas-dosen', (req, res) => {
//     res.sendFile(path.join(__dirname, 'views', '/protected/tugas-dosen.html'));
// });

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




// app.use('/table-dosen', (req, res) => {
//     res.sendFile(path.join(__dirname, 'views', 'table-dosen.html'));
// });

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
