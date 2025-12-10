const express = require('express');
const router = express.Router();
const studentController = require('../../controllers/studentController');
const viewController = require('../../controllers/viewController');
const { requireStudent } = require('../../middleware/authStudent'); 

// ============= STUDENT VIEW ROUTES =============
router.get('/editor-tugas.html', viewController.viewEditorTugas);

// ============ STUDENT DASHBOARD ROUTES =============
router.get('/dashboard', requireStudent, studentController.getDashboard);
router.post('/toggle-task', requireStudent, studentController.toggleTask);
router.post('/save-note', requireStudent, studentController.saveNote);

// =========== STUDENT CLASS PROGRESS =============
router.get('/class-progress', requireStudent, studentController.getClassProgress);
router.get('/class-progress/:npm', requireStudent, studentController.getStudentDetail);

// ============ STUDENT PROFILE ROUTES =============
router.get('/profile', requireStudent, studentController.getProfile);
router.put('/profile', requireStudent, studentController.updateProfile);

module.exports = router;