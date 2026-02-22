const router = require("express").Router();
const { createQuotation, getAllQuotations, getQuotation, updateStatus, deleteQuotation } = require("../controllers/quotationController");
const auth = require("../middleware/authMiddleware");

router.post("/", createQuotation);           // Public (from website form)
router.get("/", auth, getAllQuotations);      // Admin
router.get("/:id", auth, getQuotation);      // Admin
router.patch("/:id/status", auth, updateStatus); // Admin
router.delete("/:id", auth, deleteQuotation);    // Admin

module.exports = router;
