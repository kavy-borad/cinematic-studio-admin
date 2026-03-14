const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { createBill } = require("../controllers/billController");

router.post("/", auth, createBill);

module.exports = router;
