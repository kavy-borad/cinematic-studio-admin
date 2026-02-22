const router = require("express").Router();
const { getAllServices, getService, createService, updateService, deleteService } = require("../controllers/serviceController");
const auth = require("../middleware/authMiddleware");

router.get("/", getAllServices);            // Public
router.get("/:id", getService);             // Public
router.post("/", auth, createService);      // Admin
router.put("/:id", auth, updateService);    // Admin
router.delete("/:id", auth, deleteService); // Admin

module.exports = router;
