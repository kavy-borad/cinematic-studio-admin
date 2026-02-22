const router = require("express").Router();
const { getAllClients, getClient, createClient, updateClient, deleteClient } = require("../controllers/clientController");
const auth = require("../middleware/authMiddleware");

router.get("/", auth, getAllClients);       // Admin
router.get("/:id", auth, getClient);        // Admin
router.post("/", auth, createClient);       // Admin
router.put("/:id", auth, updateClient);     // Admin
router.delete("/:id", auth, deleteClient);  // Admin

module.exports = router;
