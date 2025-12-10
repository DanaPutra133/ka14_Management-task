const jwt = require("jsonwebtoken");

// Middleware untuk verifikasi apakah user adalah Editor atau Admin
const verifyEditorOrAdmin = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (token) {
    return jwt.verify(
      token,
      process.env.JWT_SECRET,
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
module.exports = { verifyEditorOrAdmin };
