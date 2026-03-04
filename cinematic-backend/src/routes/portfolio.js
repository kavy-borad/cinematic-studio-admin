const router = require("express").Router();
const {
    getAllPortfolios,
    getPortfolio,
    getPortfolioBySlug,
    createPortfolio,
    updatePortfolio,
    removeImage,
    deletePortfolio,
} = require("../controllers/portfolioController");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// upload.any() → accepts any field name/count; controller separates by fieldname
const portfolioUpload = upload.any();

// ── Public Routes ─────────────────────────────────────────────────────────────
router.get("/", getAllPortfolios);                              // GET all (with optional ?category=)
router.get("/slug/:slug", getPortfolioBySlug);                 // GET by slug  ← MUST be before /:id
router.get("/:id", getPortfolio);                              // GET by id

// ── Admin Routes (auth protected) ────────────────────────────────────────────
router.post("/", auth, portfolioUpload, createPortfolio);      // POST – Add new portfolio
router.patch("/:id", auth, portfolioUpload, updatePortfolio);  // PATCH – Update portfolio
router.delete("/:id/image", auth, removeImage);                // DELETE – Remove single image
router.delete("/:id", auth, deletePortfolio);                  // DELETE – Delete portfolio

module.exports = router;
