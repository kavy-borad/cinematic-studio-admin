const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

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
    category: {
        type: DataTypes.ENUM("Weddings", "Pre-Wedding", "Corporate", "Portraits", "Events"),
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

module.exports = Portfolio;
