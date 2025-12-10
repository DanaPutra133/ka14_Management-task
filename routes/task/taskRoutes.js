const express = require('express');
const router = express.Router();
const taskController = require('../../controllers/taskController');
const { verifyEditorOrAdmin } = require("../../middleware/editorOrAdminAccess"); // Pastikan middleware ini ada dan diexport

// ============ TASK ROUTES USER =============
router.get('/mahasiswa', taskController.getTasks);
router.post("/mahasiswa", verifyEditorOrAdmin, taskController.createTask);
router.put("/mahasiswa/:index", verifyEditorOrAdmin, taskController.updateTask);
router.delete('/mahasiswa/:index', verifyEditorOrAdmin, taskController.deleteTask);

module.exports = router;