const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log(`\n🔐 [AUTH] Login attempt for email: ${email}`);

        if (!email || !password) {
            console.log(`⚠️  [AUTH] Login failed - Missing email or password`);
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log(`❌ [AUTH] Login failed - No user found with email: ${email}`);
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`❌ [AUTH] Login failed - Wrong password for: ${email}`);
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        console.log(`✅ [AUTH] Login successful - Admin: ${user.username} (${user.email})`);

        res.json({
            success: true,
            message: "Login successful",
            data: {
                admin: {
                    id: user.id,
                    name: user.username,
                    email: user.email,
                },
                token,
            },
        });
    } catch (error) {
        console.error(`💥 [AUTH] Login error:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ["password"] },
        });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/auth/change-password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current password and new password are required." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Current password is incorrect." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: "Password changed successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const { username, email } = req.body;
        if (username) user.username = username;
        if (email) user.email = email;
        await user.save();

        res.json({
            success: true,
            message: "Profile updated.",
            data: { id: user.id, username: user.username, email: user.email, role: user.role },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
    try {
        console.log(`\n🚪 [AUTH] Admin logged out: ${req.user.email}`);

        // Since we use JWT stored in local storage, backend only needs to log it
        // and return a success response. The client will delete the token.
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error(`💥 [AUTH] Logout error:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
