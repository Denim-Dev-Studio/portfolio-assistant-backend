import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class AnalysisRun extends Model {
  public id!: string;
  public portfolioId!: string;
  public status!: "completed" | "partial" | "failed";
  public generatedAt!: Date;
  public summaryJson!: Record<string, unknown>;

  static associate(models: any) {
    AnalysisRun.belongsTo(models.Portfolio, {
      foreignKey: "portfolioId",
      as: "portfolio",
    });

    AnalysisRun.hasMany(models.HoldingAnalysis, {
      foreignKey: "analysisRunId",
      as: "items",
    });
  }
}

AnalysisRun.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    portfolioId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "portfolio_id",
    },
    status: {
      type: DataTypes.ENUM("completed", "partial", "failed"),
      allowNull: false,
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "generated_at",
    },
    summaryJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "summary_json",
    },
  },
  {
    sequelize,
    tableName: "analysis_runs",
    timestamps: true,
    underscored: true,
  },
);
