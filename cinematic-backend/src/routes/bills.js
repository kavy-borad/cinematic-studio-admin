const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { createBill, getBills, updateBill, updateBillStatus } = require("../controllers/billController");

router.post("/", auth, createBill);
router.get("/", auth, getBills);
router.put("/:id", auth, updateBill);
router.patch("/:id/status", auth, updateBillStatus);

module.exports = router;
