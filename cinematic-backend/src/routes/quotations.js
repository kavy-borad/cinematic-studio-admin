const router = require("express").Router();
const { createQuotation, getAllQuotations, getQuotation, updateStatus, updateQuotation, deleteQuotation, getUnreadCount, getUnreadQuotations, markAsRead, markAllAsRead } = require("../controllers/quotationController");
const auth = require("../middleware/authMiddleware");

router.post("/", createQuotation);                    // Public (from website form)
router.get("/unread-count", auth, getUnreadCount);    // Admin (notification badge)
router.get("/unread", auth, getUnreadQuotations);     // Admin (notification list)
router.patch("/mark-all-read", auth, markAllAsRead);  // Admin (clear all notifications)
router.get("/", auth, getAllQuotations);               // Admin
router.get("/:id", auth, getQuotation);               // Admin
router.put("/:id", auth, updateQuotation);            // Admin (Update all details)
router.patch("/:id/status", auth, updateStatus);      // Admin
router.patch("/:id/read", auth, markAsRead);          // Admin (mark single as read)
router.delete("/:id", auth, deleteQuotation);         // Admin

module.exports = router;
