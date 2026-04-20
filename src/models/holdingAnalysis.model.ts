import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class HoldingAnalysis extends Model {
  public id!: string;
  public analysisRunId!: string;
  public portfolioItemId!: string;
  public symbol!: string;
  public action!: "BUY_MORE" | "HOLD" | "WATCH" | "SELL";
  public score!: number;
  public confidence!: number;
  public reasoningJson!: string[];
  public signalsJson!: Record<string, unknown>;

  static associate(models: any) {
    HoldingAnalysis.belongsTo(models.AnalysisRun, {
      foreignKey: "analysisRunId",
      as: "analysisRun",
    });

    HoldingAnalysis.belongsTo(models.PortfolioItem, {
      foreignKey: "portfolioItemId",
      as: "portfolioItem",
    });
  }
}

HoldingAnalysis.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    analysisRunId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "analysis_run_id",
    },
    portfolioItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "portfolio_item_id",
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM("BUY_MORE", "HOLD", "WATCH", "SELL"),
      allowNull: false,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reasoningJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "reasoning_json",
    },
    signalsJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "signals_json",
    },
  },
  {
    sequelize,
    tableName: "holding_analyses",
    timestamps: true,
    underscored: true,
  },
);
