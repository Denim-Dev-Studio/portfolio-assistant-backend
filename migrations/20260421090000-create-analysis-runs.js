"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("analysis_runs", {
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
      status: {
        type: Sequelize.ENUM("completed", "partial", "failed"),
        allowNull: false,
      },
      generated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      summary_json: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("analysis_runs");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_analysis_runs_status";');
  },
};
