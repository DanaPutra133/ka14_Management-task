const webpush = require("web-push");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ============= SETUP VAPID DETAILS =============
if (process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ============= SUBSCRIPTION MANAGEMENT =============
const loadSubs = async () => {
  return await prisma.pushSubscription.findMany();
};

const saveSub = async (sub) => {
  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { keysAuth: sub.keys.auth, keysP256dh: sub.keys.p256dh },
      create: {
        endpoint: sub.endpoint,
        keysAuth: sub.keys.auth,
        keysP256dh: sub.keys.p256dh,
      },
    });
  } catch (e) {
    console.error("Gagal save subscribe", e);
  }
};

const deleteSub = async (endpoint) => {
  try {
    await prisma.pushSubscription.delete({ where: { endpoint } });
  } catch (e) {}
};

// ============= PUSH NOTIFICATION SENDING =============
const sendPushToAll = async (payload) => {
  const subs = await loadSubs();
  if (!subs.length) return 0;

  let sentCount = 0;
  for (let sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { auth: sub.keysAuth, p256dh: sub.keysP256dh },
        },
        JSON.stringify(payload)
      );
      sentCount++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        await deleteSub(sub.endpoint);
      }
    }
  }
  return sentCount;
};

// ============ PUSH REMINDER LOGIC =============
// === web push reminder helper ===
const processPushReminders = async (type) => {
  const now = new Date();
  let targetDate = new Date();
  // H-3, H-1, H
  if (type === "H-3") targetDate.setDate(now.getDate() + 3);
  else if (type === "H-1") targetDate.setDate(now.getDate() + 1);
  else targetDate.setDate(now.getDate());

  const ymd = targetDate.toISOString().split("T")[0];
  const tugas = await prisma.tugasMhs.findMany({
    where: { deadline: { equals: new Date(ymd) } },
  });

  if (!tugas.length) return;

  let msg =
    `Ada ${tugas.length} tugas deadline ${type}:\n` +
    tugas.map((t) => `• ${t.Namatugas} (${t.matakuliah}) - ${ymd}`).join("\n");

  await sendPushToAll({
    title: `Reminder Tugas ${type}`,
    body: msg,
    icon: "/img/splash1.png",
  });
};

// === discord webhook helper ===
const sendDiscordWebhook = async (payload) => {
  if (!process.env.DISCORD_WEBHOOK_URL) return;
  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, payload);
  } catch (err) {
    console.error("Discord webhook error:", err.message);
  }
};

// ======== kategori tugas ========
const getKategori = (task) => {
  const categories = [];
  if (task.kelompok) categories.push("Kelompok");
  if (task.vclass) categories.push("VClass");
  if (task.praktikum) categories.push("Praktikum");
  if (task.ilab) categories.push("iLab");
  if (task.Mandiri) categories.push("Mandiri");
  return categories.length > 0 ? categories.join(", ") : "-";
};

// ============ DISCORD REMINDER LOGIC =============
const processDiscordReminders = async (type) => {
  let target = new Date();
  if (type === "H-3") target.setDate(new Date().getDate() + 3);
  else if (type === "H-1") target.setDate(new Date().getDate() + 1);
  else target = new Date();

  const ymd = target.toISOString().split("T")[0];
  const tugas = await prisma.tugasMhs.findMany({
    where: { deadline: { equals: new Date(ymd) } },
  });

  if (!tugas || !tugas.length) return;

  // ======= Discord Embed Message =======
  // yang akan tampil di pesan discord
  const map = {
    // "H-3": { color: 0xffd93d, title: "🔔 REMINDER H-3 DEADLINE TUGAS! 🔔" },
    // "H-1": { color: 0xff4d4d, title: "🚨 FINAL REMINDER H-1 DEADLINE TUGAS! 🚨", },
    "H-1": { color: 0xff4d4d, title: "⚠️ JADWAL UJIAN UTAMA H-1 JANGAN SAMPAI LUPA! ⚠️" },
    // H: { color: 0x4caf50, title: "✅ HARI-H DEADLINE TUGAS! ✅" },
    // H: { color: 0x4caf50, title: "✅ Jadwal UTS Hari ini!  ✅" },
    H: { color: 0x4caf50, title: "⚠️ JADWAL UJIAN UTAMA HARI INI! ⚠️" },
  };

    const s = map[type];
    const fields = tugas.map((t) => ({
    name: `${t.matakuliah || "Umum"}`,
    value: `• ${t.Namatugas || "-"}\n• Deadline: ${new Date(
      t.deadline
    ).toLocaleDateString("id-ID")}\n• Kategori: ${getKategori(t)}\n${
      t.UrlGambar ? `• URL: ${t.UrlGambar}\n` : ""
    }`,
    inline: false,
  }));

  const embed = {
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

  await sendDiscordWebhook(embed);
};

module.exports = {
  saveSub,
  deleteSub,
  sendPushToAll,
  processPushReminders,
  processDiscordReminders,
};
