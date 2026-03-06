const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Simple slug generator
function generateSlug(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/--+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const Service = sequelize.define("Service", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // ── Primary identifier (spec uses "title") ──────────────────────────
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: true,   // unique enforced in beforeCreate hook below
    },
    // ── Descriptions ────────────────────────────────────────────────────
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    shortDescription: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    // ── Pricing ─────────────────────────────────────────────────────────
    startingPrice: {
        type: DataTypes.STRING,     // e.g. "₹15,000" — display string
        allowNull: true,
    },
    // ── Image ───────────────────────────────────────────────────────────
    thumbnail: {
        type: DataTypes.STRING,     // relative /uploads/... or absolute URL
        allowNull: true,
    },
    // ── Features ────────────────────────────────────────────────────────
    features: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    // ── Flags ───────────────────────────────────────────────────────────
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    popular: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    // ── Legacy / optional ────────────────────────────────────────────────
    icon: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "Camera",
    },
    duration: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    packageName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Silver / Gold / Platinum — null for standalone services",
    },
});

// Auto-generate slug from title on create
Service.beforeCreate(async (service) => {
    if (!service.slug && service.title) {
        let base = generateSlug(service.title);
        let slug = base;
        let count = 1;
        while (await Service.findOne({ where: { slug } })) {
            slug = `${base}-${count++}`;
        }
        service.slug = slug;
    }
});

// Re-generate slug on title update (only if slug not explicitly set)
Service.beforeUpdate(async (service) => {
    if (service.changed("title") && service.title && !service.changed("slug")) {
        let base = generateSlug(service.title);
        let slug = base;
        let count = 1;
        while (await Service.findOne({ where: { slug } })) {
            slug = `${base}-${count++}`;
        }
        service.slug = slug;
    }
});

module.exports = Service;
