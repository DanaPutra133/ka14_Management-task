const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ============= Get All Tasks =============
exports.getTasks = async (req, res) => {
  try {
    const rows = await prisma.tugasMhs.findMany({
      orderBy: { deadline: "asc" },
    });
    const result = rows.map((r) => ({
      ...r,
      deadline: r.deadline
        ? new Date(r.deadline).toISOString().split("T")[0]
        : null,
    }));
    return res.json(result);
  } catch (err) {
    console.error("gagal mengambil tugas:", err);
    return res.status(500).json([]);
  }
};

// ============= Create New Task =============
exports.createTask = async (req, res) => {
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
        createdBy: req.actor ? req.actor.id : "system", // Handle jika req.actor undefined
      },
    });
    return res.status(201).json({
      ...created,
      deadline: created.deadline
        ? new Date(created.deadline).toISOString().split("T")[0]
        : null,
    });
  } catch (err) {
    console.error("Error creating mahasiswa task:", err);
    return res.status(500).json({ error: "Failed to create task, hubungi dana!" });
  }
};


// ============= Update Task =============
exports.updateTask = async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const rows = await prisma.tugasMhs.findMany({
      orderBy: { deadline: "asc" },
    });

    if (isNaN(idx) || idx < 0 || idx >= rows.length) {
      return res.status(404).json({ error: "Task not found" });
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
        deadline: body.deadline ? new Date(body.deadline) : rows[idx].deadline,
        kelompok: body.kelompok ?? rows[idx].kelompok,
        vclass: body.vclass ?? rows[idx].vclass,
        praktikum: body.praktikum ?? rows[idx].praktikum,
        ilab: body.ilab ?? rows[idx].ilab,
        Mandiri: body.Mandiri ?? rows[idx].Mandiri,
        updatedBy: req.actor ? req.actor.id : "system",
      },
    });
    return res.json({
      ...updated,
      deadline: updated.deadline
        ? new Date(updated.deadline).toISOString().split("T")[0]
        : null,
    });
  } catch (err) {
    console.error("Error updating mahasiswa task:", err);
    return res.status(500).json({ error: "Failed to update task" });
  }
};

// ============= Update Task =============
exports.deleteTask = async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const rows = await prisma.tugasMhs.findMany({
      orderBy: { deadline: "asc" },
    });

    if (isNaN(idx) || idx < 0 || idx >= rows.length) {
      return res.status(404).json({ error: "Task not found" });
    }

    const id = rows[idx].id;
    await prisma.tugasMhs.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error("Error deleting mahasiswa task:", err);
    return res.status(500).json({ error: "Failed to delete task" });
  }
};
