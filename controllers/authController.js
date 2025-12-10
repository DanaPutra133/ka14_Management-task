const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");


const VALID_NPMS = process.env.VALID_NPMS
  ? process.env.VALID_NPMS.split(",")
  : [];

// ============= Check NPM Status =============
exports.checkNpm = async (req, res) => {
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
};

// ============= Register =============
exports.register = async (req, res) => {
  const { npm, pin, email } = req.body;

  if (!VALID_NPMS.includes(npm))
    return res.status(403).json({ error: "NPM Ilegal / Tidak Terdaftar" });
  if (!pin || !email)
    return res.status(400).json({ error: "Data tidak lengkap" });

  if (pin === npm)
    return res.status(400).json({
      error: "PIN tidak boleh sama dengan NPM Anda! Gunakan kombinasi lain.",
    });
  if (VALID_NPMS.includes(pin))
    return res.status(400).json({
      error:
        "Dilarang menggunakan NPM sebagai PIN! Harap buat PIN angka yang unik.",
    });
  if (pin.length < 6)
    return res.status(400).json({ error: "PIN minimal 6 karakter." });

  const exist = await prisma.user.findUnique({ where: { npm } });
  if (exist) return res.status(400).json({ error: "NPM sudah terdaftar." });

  const hashedPin = await bcrypt.hash(pin, 10);

  try {
    await prisma.user.create({
      data: { npm, pin: hashedPin, email, isApproved: false },
    });
    res.json({
      success: true,
      message: "Registrasi Berhasil! Tunggu persetujuan Admin.",
    });
  } catch (e) {
    res.status(500).json({ error: "Gagal registrasi db" });
  }
};

// ============= Login user =============

exports.login = async (req, res) => {
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
    return res.status(403).json({
      success: false,
      message: "Akun belum disetujui Admin, Hubungi Dana!",
    });
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
};


// ============= Logout user =============

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
};

// ============= Check Session user =============
exports.checkSession = (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  res.json({ loggedIn: false });
};