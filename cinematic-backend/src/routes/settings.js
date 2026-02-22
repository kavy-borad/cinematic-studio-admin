const router = require("express").Router();
const { getSettings, getPublicSettings, updateSettings } = require("../controllers/settingsController");
const auth = require("../middleware/authMiddleware");

router.get("/public", getPublicSettings);     // Public – for client website
router.get("/", auth, getSettings);           // Admin
router.put("/", auth, updateSettings);        // Admin

module.exports = router;
