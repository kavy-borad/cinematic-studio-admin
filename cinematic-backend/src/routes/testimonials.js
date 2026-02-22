const router = require("express").Router();
const { getApproved, createTestimonial, getAll, approve, reject, deleteTestimonial } = require("../controllers/testimonialController");
const auth = require("../middleware/authMiddleware");

router.get("/", getApproved);                        // Public
router.post("/", createTestimonial);                  // Public – submit for review
router.get("/all", auth, getAll);                     // Admin
router.patch("/:id/approve", auth, approve);          // Admin
router.patch("/:id/reject", auth, reject);            // Admin
router.delete("/:id", auth, deleteTestimonial);       // Admin

module.exports = router;
