const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../../controllers/uploadController');
const { checkUploadAccess } = require("../../middleware/uploaderAccess");

const upload = multer({ storage: multer.memoryStorage() });

// ============ UPLOAD ROUTES =============
router.post('/upload-proxy', checkUploadAccess, upload.single('image'), uploadController.uploadImageProxy);

module.exports = router;