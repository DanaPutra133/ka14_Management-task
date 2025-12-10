const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const webpush = require("web-push");
const axios = require("axios");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PIN = process.env.ADMIN_PIN;

exports.login = (req, res) => {
  const { pin } = req.body;
  if (pin !== ADMIN_PIN) {
    return res
      .status(401)
      .json({ success: false, message: "PIN Admin salah!" });
  }
  // Token berlaku 1 jam 
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ success: true, token: token });
};

// ============= ADMIN USER MANAGEMENT =============
// ====================== Notification ======================
exports.broadcastPush = async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body)
    return res.status(400).json({ error: "Judul dan Isi pesan wajib diisi." });

  try {
    const subs = await prisma.pushSubscription.findMany();
    if (subs.length === 0)
      return res.json({ message: "Tidak ada subscriber." });

    const promises = subs.map((sub) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { auth: sub.keysAuth, p256dh: sub.keysP256dh },
          },
          JSON.stringify({
            title: title,
            body: body,
            icon: "/img/splash1.png",
          })
        )
        .catch((err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            prisma.pushSubscription
              .delete({ where: { endpoint: sub.endpoint } })
              .catch(() => {});
          }
        })
    );

    await Promise.all(promises);
    res.json({
      success: true,
      message: `Notifikasi dikirim ke ${subs.length} user.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendDiscord = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Pesan wajib diisi" });

  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, { content: message });
    res.json({ success: true, message: "Pesan Discord terkirim." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ====================== USER MANAGEMENT ======================
// ------------- USER PENDING ---------

exports.getPendingUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { isApproved: false } });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ============= USER APPROVAL & MANAGEMENT =============

exports.approveUser = async (req, res) => {
  const { npm, action } = req.body;
  try {
    if (action === "reject") {
      await prisma.user.delete({ where: { npm } });
      return res.json({
        success: true,
        message: `User ${npm} ditolak & dihapus.`,
      });
    }
    await prisma.user.update({ where: { npm }, data: { isApproved: true } });
    res.json({ success: true, message: `User ${npm} berhasil di approve!` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ============= USER DATA & PROGRESS =============

exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { taskProgress: true },
      orderBy: { npm: "asc" },
    });
    const totalTugas = await prisma.tugasMhs.count();

    const data = users.map((u) => {
      const completedCount = u.taskProgress.filter((t) => t.isCompleted).length;
      return {
        npm: u.npm,
        nama: u.nama,
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
};

exports.getUserDetail = async (req, res) => {
  try {
    const { npm } = req.params;
    const user = await prisma.user.findUnique({
      where: { npm },
      include: { taskProgress: true },
    });

    if (!user) return res.status(404).json({ error: "User tidak ditemukan!" });

    const allTasks = await prisma.tugasMhs.findMany({
      orderBy: { deadline: "asc" },
    });

    const taskDetails = allTasks.map((task) => {
      const prog = user.taskProgress.find((p) => p.tugasId === task.id);
      return {
        matakuliah: task.matakuliah,
        namatugas: task.Namatugas,
        isCompleted: prog ? prog.isCompleted : false,
        catatan: prog ? prog.catatan : "-",
      };
    });

    res.json({
      npm: user.npm,
      nama: user.nama,
      email: user.email,
      tasks: taskDetails,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { npm } = req.params;
    await prisma.userTaskProgress.deleteMany({ where: { userNpm: npm } });
    await prisma.user.delete({ where: { npm } });
    res.json({ success: true, message: "User berhasil dihapus permanent." });
  } catch (e) {
    res.status(500).json({ error: "Gagal hapus user" });
  }
};

exports.resetPin = async (req, res) => {
  const { npm, newPin } = req.body;
  try {
    const hashedPin = await bcrypt.hash(newPin, 10);
    await prisma.user.update({ where: { npm }, data: { pin: hashedPin } });
    res.json({ success: true, message: "PIN User berhasil direset." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ============= TOGGLE EDITOR STATUS USER =============

exports.toggleEditor = async (req, res) => {
  const { npm, isEditor } = req.body;
  try {
    await prisma.user.update({ where: { npm }, data: { isEditor: isEditor } });
    res.json({
      success: true,
      message: `Status Editor user ${npm} diubah jadi ${isEditor}`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ====================== ADMIN VIEWS ======================

exports.viewAdminDashboard = (req, res) => {
  res.sendFile(path.join(__dirname, "../views", "admin.html"));
};

exports.viewAdminUsers = (req, res) => {
  res.sendFile(path.join(__dirname, "../views", "admin-users.html"));
};
