const notifService = require("../services/notificationService");

// ============= Get VAPID Public Key =============
exports.getVapidKey = (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
};

// ============= Subscribe to Notifications =============
exports.subscribe = async (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint || !sub.keys)
    return res.status(400).json({ error: "Invalid subscription" });

  await notifService.saveSub(sub);
  res.status(201).json({ success: true });
};

// ============= Unsubscribe from Notifications =============
exports.unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "Invalid endpoint" });

  try {
    await notifService.deleteSub(endpoint);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ============= Send Test Push Notification =============
exports.testPushCustom = async (req, res) => {
  const clientKey = req.headers["x-api-key"];
  if (clientKey !== process.env.TEST_PUSH_KEY) {
    return res.status(403).json({ error: "API key salah." });
  }

  const { title, body, icon } = req.body;
  if (!title || !body || !icon) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  try {
    const sentCount = await notifService.sendPushToAll({ title, body, icon });
    if (sentCount === 0)
      return res.status(400).json({ error: "Tidak ada subs." });
    res.json({ success: true, sentTo: sentCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ============= Send Production Push Notification =============
exports.pushNotifyProduction = async (req, res) => {
  const clientKey = req.headers["x-api-key-pro"];
  if (clientKey !== process.env.PRODUCTION_PUSH) {
    return res.status(403).json({ error: "API key salah." });
  }

  const { title, body, icon } = req.body;
  try {
    const sentCount = await notifService.sendPushToAll({ title, body, icon });
    res.json({ success: true, sentTo: sentCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
