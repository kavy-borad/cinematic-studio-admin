const router = require("express").Router();
const { getAllPortfolios, getPortfolio, createPortfolio, updatePortfolio, removeImage, deletePortfolio } = require("../controllers/portfolioController");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.get("/", getAllPortfolios);                                          // Public
router.get("/:id", getPortfolio);                                           // Public
router.post("/", auth, upload.array("images", 20), createPortfolio);        // Admin
router.patch("/:id", auth, upload.array("images", 20), updatePortfolio);    // Admin
router.delete("/:id/image", auth, removeImage);                             // Admin – remove single image
router.delete("/:id", auth, deletePortfolio);                               // Admin

module.exports = router;
