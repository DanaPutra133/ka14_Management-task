const jwt = require("jsonwebtoken");

// Middleware untuk cek akses upload 
const checkUploadAccess = (req, res, next) => {
    if (req.headers['authorization']) {
        const token = req.headers['authorization'].split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userAdmin = decoded; 
            return next(); 
        } catch (e) {
        }
    }
        if (req.session && req.session.user) {
        return next();
    }

    return res.status(403).json({ error: 'Akses ditolak. Anda belum login.' });
};

module.exports = { checkUploadAccess };