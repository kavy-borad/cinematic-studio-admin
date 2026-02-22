const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Service = sequelize.define("Service", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "Camera",
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    duration: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    popular: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    features: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    packageName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Silver / Gold / Platinum — null for standalone services",
    },
});

module.exports = Service;
