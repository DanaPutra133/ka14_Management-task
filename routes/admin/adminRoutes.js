const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const { verifyAdmin } = require('../../middleware/authAdmin'); 

//. ============ AUTH ROUTES ADMIN =============
router.post('/api/admin/login', adminController.login);

// ============ ADMIN NOTIFICATIONS =============
router.post('/api/admin/push/broadcast', verifyAdmin, adminController.broadcastPush);
router.post('/api/admin/discord/custom', verifyAdmin, adminController.sendDiscord);

// ============ ADMIN USER MANAGEMENT =============
router.get('/api/admin/users', verifyAdmin, adminController.getAllUsers);
router.get('/api/admin/users/pending', verifyAdmin, adminController.getPendingUsers);
router.post('/api/admin/users/approve', verifyAdmin, adminController.approveUser);
router.get('/api/admin/users/:npm', verifyAdmin, adminController.getUserDetail);
router.delete('/api/admin/users/:npm', verifyAdmin, adminController.deleteUser);
router.post('/api/admin/users/reset-pin', verifyAdmin, adminController.resetPin);
router.post('/api/admin/users/toggle-editor', verifyAdmin, adminController.toggleEditor);

// ============ ADMIN VIEWS =============
router.get('/admin', adminController.viewAdminDashboard);
router.get('/admin-users', adminController.viewAdminUsers);

module.exports = router;