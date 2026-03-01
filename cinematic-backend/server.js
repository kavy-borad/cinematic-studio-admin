require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const sequelize = require("./src/config/database");
const errorHandler = require("./src/middleware/errorHandler");
const seedDatabase = require("./src/utils/seeder");

// Import models (so Sequelize registers them)
require("./src/models/User");
require("./src/models/Quotation");
require("./src/models/Portfolio");
require("./src/models/Service");
require("./src/models/Client");
require("./src/models/Testimonial");
require("./src/models/Setting");
require("./src/models/ApiLog");

// Import routes
const authRoutes = require("./src/routes/auth");
const dashboardRoutes = require("./src/routes/dashboard");
const quotationRoutes = require("./src/routes/quotations");
const portfolioRoutes = require("./src/routes/portfolio");
const serviceRoutes = require("./src/routes/services");
const clientRoutes = require("./src/routes/clients");
const testimonialRoutes = require("./src/routes/testimonials");
const settingsRoutes = require("./src/routes/settings");
const logsRoutes = require("./src/routes/logs");
const apiLogger = require("./src/middleware/apiLogger");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:8080")
    .split(",")
    .map((s) => s.trim());

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all in dev; tighten in production
        }
    },
    credentials: true,
}));
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(apiLogger); // API log capture middleware (must be after body parsers)

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve public static files
app.use(express.static(path.join(__dirname, "public")));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.json({ success: true, message: "🎬 Cinematic Frame Backend API is running!" });
});

// Standalone Log Viewer Page
app.get("/log-viewer", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "log-viewer.html"));
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/logs", logsRoutes);
// 404 catch-all
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});
// ─── Error Handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────
async function startServer() {
    try {
        // Test DB connection
        await sequelize.authenticate();
        console.log("✅ MySQL connected successfully!");

        // Sync all models (creates tables if not exist; use { force: false } in production)
        await sequelize.sync({ alter: process.env.NODE_ENV !== "production" });
        console.log("✅ Database tables synced!");

        // Seed initial data
        await seedDatabase();

        // Start listening
        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📡 API Base URL: http://localhost:${PORT}/api\n`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();
