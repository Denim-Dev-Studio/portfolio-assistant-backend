"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("holding_analyses", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      analysis_run_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "analysis_runs",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      portfolio_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "portfolio_items",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      symbol: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action: {
        type: Sequelize.ENUM("BUY_MORE", "HOLD", "WATCH", "SELL"),
        allowNull: false,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      confidence: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reasoning_json: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      signals_json: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("holding_analyses");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_holding_analyses_action";');
  },
};
