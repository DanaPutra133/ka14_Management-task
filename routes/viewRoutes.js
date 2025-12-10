const express = require("express");
const router = express.Router();
const path = require("path");
const viewController = require("../controllers/viewController");

// ============ VIEW ROUTES =============
const viewsDir = path.join(__dirname, "..", "views");

// ============= LANDING PAGE VIEW ============
router.get("/", (req, res) => {
  res.sendFile(path.join(viewsDir, "index.html")); 
});

// ============ DASHBOARD VIEW USER ============
router.get("/dashboard-user", (req, res) => {
  res.sendFile(path.join(viewsDir, "dashboard.html"));
});

// ============ EDITOR TUGAS VIEW USER ============
router.get("/editor-tugas.html", viewController.viewEditorTugas);

// --- ADMIN VIEWS ---

// ============ LOGIN ADMIN VIEW ============
router.get("/login-admin", (req, res) => {
  res.sendFile(path.join(viewsDir, "loginAdmin.html")); 
});


// ============ ADMIN VIEW PAGES ============
router.get("/admin", (req, res) => {
  res.sendFile(path.join(viewsDir, "admin.html"));
});
// ============ ADMIN USERS VIEW USER MANAGEMENT ============
router.get("/admin-users", (req, res) => {
  res.sendFile(path.join(viewsDir, "admin-users.html"));
});

// ============ LOGIN MAHASISWA VIEW ============
router.get("/login-mahasiswa", (req, res) => {
  res.sendFile(path.join(viewsDir, "login-mahasiswa.html"));
});

// =========== TABLE MAHASISWA VIEW ALL TUGAS ============
router.get("/table-mhs", (req, res) => {
  res.sendFile(path.join(viewsDir, "table-mhs.html"));
});

// =========== KALENDER TUGAS VIEW MAHASISWA ============
router.get("/kalenderTugas", (req, res) => {
  res.sendFile(path.join(viewsDir, "kalenderTugas.html"));
});

module.exports = router;
