const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { createBill, getBills, updateBill, updateBillStatus, downloadBillPDF, deleteBill } = require("../controllers/billController");

router.post("/", auth, createBill);
router.get("/", auth, getBills);
router.get("/:id/pdf", auth, downloadBillPDF);
router.put("/:id", auth, updateBill);
router.patch("/:id/status", auth, updateBillStatus);

router.delete("/:id", auth, deleteBill);

module.exports = router;
