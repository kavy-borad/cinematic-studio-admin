const router = require("express").Router();
const { getAllAdmins, createAdmin, deleteAdmin } = require("../controllers/adminController");
const auth = require("../middleware/authMiddleware");

// All admin routes are protected (JWT required)
router.get("/", auth, getAllAdmins);
router.post("/create", auth, createAdmin);
router.delete("/:id", auth, deleteAdmin);

module.exports = router;
