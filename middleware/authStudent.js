// Middleware untuk verifikasi apakah user adalah mahasiswa
const requireStudent = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "mahasiswa") {
    if (req.originalUrl.startsWith("/api")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/login-mahasiswa");
  }
  next();
};
module.exports = {requireStudent};