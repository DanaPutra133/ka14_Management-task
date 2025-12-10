const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware untuk verifikasi apakah Admin
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

module.exports = { verifyAdmin };
