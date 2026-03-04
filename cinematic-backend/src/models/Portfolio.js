const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Simple slug generator (no external package needed)
function generateSlug(title) {
    return title
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")   // remove special chars
        .replace(/[\s_]+/g, "-")    // spaces/underscores → hyphen
        .replace(/--+/g, "-")       // collapse multiple hyphens
        .replace(/^-+|-+$/g, "");   // trim leading/trailing hyphens
}

const Portfolio = sequelize.define("Portfolio", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
    },
    category: {
        type: DataTypes.STRING(100),   // Dynamic – no fixed ENUM; pass any category string
        allowNull: false,
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    clientName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    eventDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    photoCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    videoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

// Auto-generate slug from title on create
Portfolio.beforeCreate(async (portfolio) => {
    if (!portfolio.slug && portfolio.title) {
        let base = generateSlug(portfolio.title);
        let slug = base;
        let count = 1;
        // Ensure uniqueness
        while (await Portfolio.findOne({ where: { slug } })) {
            slug = `${base}-${count++}`;
        }
        portfolio.slug = slug;
    }
});

// Re-generate slug if title changes on update
Portfolio.beforeUpdate(async (portfolio) => {
    if (portfolio.changed("title") && portfolio.title) {
        let base = generateSlug(portfolio.title);
        let slug = base;
        let count = 1;
        while (await Portfolio.findOne({ where: { slug } })) {
            slug = `${base}-${count++}`;
        }
        portfolio.slug = slug;
    }
});

module.exports = Portfolio;
