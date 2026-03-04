const bcrypt = require("bcryptjs");
const User = require("../models/User");

// GET /api/admins — Fetch all admins
exports.getAllAdmins = async (req, res) => {
    try {
        console.log(`\n👥 [ADMIN] Fetching all admins — Requested by: ${req.user.email}`);

        const admins = await User.findAll({
            attributes: ["id", "username", "email", "role", "createdAt"],
            order: [["createdAt", "DESC"]],
        });

        // Map to match the agreed response format (username → name)
        const formattedAdmins = admins.map((admin) => ({
            id: admin.id,
            name: admin.username,
            email: admin.email,
            createdAt: admin.createdAt,
        }));

        console.log(`✅ [ADMIN] Found ${formattedAdmins.length} admin(s)`);

        res.json({
            success: true,
            message: "Admins fetched successfully",
            data: formattedAdmins,
        });
    } catch (error) {
        console.error(`💥 [ADMIN] Error fetching admins:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/admins/create — Create a new admin
exports.createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        console.log(`\n➕ [ADMIN] Create admin request — By: ${req.user.email}`);
        console.log(`   📝 Name: ${name}, Email: ${email}`);

        // Validation
        if (!name || !email || !password) {
            console.log(`⚠️  [ADMIN] Create failed — Missing required fields`);
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required.",
            });
        }

        if (password.length < 6) {
            console.log(`⚠️  [ADMIN] Create failed — Password too short`);
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters.",
            });
        }

        // Check if email already exists
        const existingAdmin = await User.findOne({ where: { email } });
        if (existingAdmin) {
            console.log(`❌ [ADMIN] Create failed — Email already exists: ${email}`);
            return res.status(400).json({
                success: false,
                message: "Admin with this email already exists",
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin
        const newAdmin = await User.create({
            username: name,
            email,
            password: hashedPassword,
            role: "admin",
        });

        console.log(`✅ [ADMIN] New admin created — ID: ${newAdmin.id}, Name: ${name}, Email: ${email}`);

        res.status(201).json({
            success: true,
            message: "New admin created successfully",
            data: {
                id: newAdmin.id,
                name: newAdmin.username,
                email: newAdmin.email,
                createdAt: newAdmin.createdAt,
            },
        });
    } catch (error) {
        console.error(`💥 [ADMIN] Error creating admin:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/admins/:id — Delete an admin
exports.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`\n🗑️  [ADMIN] Delete admin request — ID: ${id}, By: ${req.user.email}`);

        // Security: Cannot delete your own account
        if (parseInt(id) === req.user.id) {
            console.log(`🚫 [ADMIN] Delete blocked — Admin tried to delete own account: ${req.user.email}`);
            return res.status(403).json({
                success: false,
                message: "You cannot delete your own account",
            });
        }

        // Find the admin
        const admin = await User.findByPk(id);
        if (!admin) {
            console.log(`❌ [ADMIN] Delete failed — Admin not found with ID: ${id}`);
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        const deletedName = admin.username;
        const deletedEmail = admin.email;

        await admin.destroy();

        console.log(`✅ [ADMIN] Admin deleted — Name: ${deletedName}, Email: ${deletedEmail}, Deleted by: ${req.user.email}`);

        res.json({
            success: true,
            message: "Admin deleted successfully",
        });
    } catch (error) {
        console.error(`💥 [ADMIN] Error deleting admin:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
