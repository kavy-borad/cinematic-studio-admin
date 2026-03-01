const router = require("express").Router();
const { getLogs, getLogStats, clearLogs, getLogById } = require("../controllers/logsController");

// Log viewer routes — standalone system, no auth needed
router.get("/stats", getLogStats);
router.get("/:id", getLogById);
router.get("/", getLogs);
router.delete("/", clearLogs);

module.exports = router;
