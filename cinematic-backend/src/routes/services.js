const router = require("express").Router();
const {
    getAllServices,
    getService,
    createService,
    updateService,
    deleteService,
} = require("../controllers/serviceController");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// thumbnail is a single image field
const serviceUpload = upload.single("thumbnail");

// ── Public Routes ──────────────────────────────────────────────────────────────
router.get("/", getAllServices);            // GET all services
router.get("/:id", getService);            // GET single service

// ── Admin Routes (auth + file upload) ─────────────────────────────────────────
router.post("/", auth, serviceUpload, createService);       // POST – Create service
router.put("/:id", auth, serviceUpload, updateService);     // PUT  – Update service
router.delete("/:id", auth, deleteService);                 // DELETE – Remove service

module.exports = router;
