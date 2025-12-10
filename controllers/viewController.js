const path = require("path");

// ============= View Editor Tugas =============
exports.viewEditorTugas = (req, res) => {
  if (req.session.user && req.session.user.isEditor) {
    res.sendFile(path.join(__dirname, "..", "views", "editor-tugas.html"));
  } else {
    res.redirect("/dashboard-user");
  }
};
