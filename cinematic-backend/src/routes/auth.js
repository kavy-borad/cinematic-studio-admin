const router = require("express").Router();
const { login, getMe, changePassword, updateProfile, logout } = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

router.post("/login", login);
router.get("/me", auth, getMe);
router.patch("/change-password", auth, changePassword);
router.patch("/profile", auth, updateProfile);
router.post("/logout", auth, logout);

module.exports = router;
