"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("portfolio_items", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      portfolio_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "portfolios",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      symbol: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      avg_price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      current_price: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("portfolio_items");
  },
};
