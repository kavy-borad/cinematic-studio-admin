const router = require("express").Router();
const { getStats, getRevenueChart, getAnalytics } = require("../controllers/dashboardController");
const auth = require("../middleware/authMiddleware");

router.get("/stats", auth, getStats);
router.get("/revenue-chart", auth, getRevenueChart);
router.get("/analytics", auth, getAnalytics);

module.exports = router;
