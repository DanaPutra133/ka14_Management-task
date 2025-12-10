const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ============= Get Dashboard Data user =============
exports.getDashboard = async (req, res) => {
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
};

// ============= Toggle Task Completion user =============
exports.toggleTask = async (req, res) => {
  const { tugasId, isCompleted } = req.body;
  const userNpm = req.session.user.npm;
  try {
    await prisma.userTaskProgress.upsert({
      where: { userNpm_tugasId: { userNpm, tugasId: parseInt(tugasId) } },
      update: { isCompleted },
      create: { userNpm, tugasId: parseInt(tugasId), isCompleted },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Gagal update status, ulangi/ hubungi dana" });
  }
};

// ============= Save Note for Task user =============
exports.saveNote = async (req, res) => {
  const { tugasId, note } = req.body;
  const userNpm = req.session.user.npm;
  try {
    await prisma.userTaskProgress.upsert({
      where: { userNpm_tugasId: { userNpm, tugasId: parseInt(tugasId) } },
      update: { catatan: note },
      create: { userNpm, tugasId: parseInt(tugasId), catatan: note },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Gagal simpan catatan, ulangi/ hubungi dana" });
  }
};

// ============= Get Class Progress user =============
exports.getClassProgress = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: true },
      include: { taskProgress: true },
      orderBy: { npm: "asc" },
    });
    const totalTugas = await prisma.tugasMhs.count();

    const data = users.map((u) => {
      const completedCount = u.taskProgress.filter((t) => t.isCompleted).length;
      const percent =
        totalTugas > 0 ? Math.round((completedCount / totalTugas) * 100) : 0;
      const displayName = u.nama ? u.nama : u.npm;

      return {
        npm: u.npm,
        displayName: displayName,
        completed: completedCount,
        total: totalTugas,
        percent: percent,
      };
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ============= Get Student Detail user =============
exports.getStudentDetail = async (req, res) => {
  try {
    const { npm } = req.params;
    const user = await prisma.user.findUnique({
      where: { npm },
      include: { taskProgress: true },
    });
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    const allTasks = await prisma.tugasMhs.findMany({
      orderBy: { deadline: "asc" },
    });

    const taskDetails = allTasks.map((task) => {
      const prog = user.taskProgress.find((p) => p.tugasId === task.id);
      return {
        matakuliah: task.matakuliah,
        namatugas: task.Namatugas,
        isCompleted: prog ? prog.isCompleted : false,
      };
    });
    res.json({ npm: user.npm, tasks: taskDetails });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ============= Get Profile user =============
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { npm: req.session.user.npm },
      select: {
        npm: true,
        email: true,
        nama: true,
        noHp: true,
        fotoProfile: true,
      },
    });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Gagal mengambil data profile, ulangi/ hubungi dana" });
  }
};

// ============= Update Profile user =============
exports.updateProfile = async (req, res) => {
  try {
    const { nama, noHp, fotoProfile } = req.body;
    await prisma.user.update({
      where: { npm: req.session.user.npm },
      data: {
        nama: nama || null,
        noHp: noHp || null,
        fotoProfile: fotoProfile || null,
      },
    });
    res.json({ success: true, message: "Profile berhasil disimpan!" });
  } catch (e) {
    res.status(500).json({ error: "Gagal update profile, ulangi/ hubungi dana" });
  }
};
