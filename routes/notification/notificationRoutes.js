const express = require("express");
const router = express.Router();
const notifController = require("../../controllers/notificationController");

// ============= NOTIFICATION ROUTES =============
router.get("/vapidPublicKey", notifController.getVapidKey);
router.post("/subscribe", notifController.subscribe);
router.post("/unsubscribe", notifController.unsubscribe);

// ============= TESTING NOTIFICATION ROUTES =============
router.post("/test-push", notifController.testPushCustom);
router.post("/push-notify", notifController.pushNotifyProduction);

module.exports = router;
