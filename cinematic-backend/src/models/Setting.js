const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Setting = sequelize.define("Setting", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    group: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "general",
        comment: "e.g. contact, social, seo",
    },
});

module.exports = Setting;
