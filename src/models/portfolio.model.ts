import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Portfolio extends Model {
  public id!: string;
  public name!: string;

  static associate(models: any) {
    Portfolio.hasMany(models.PortfolioItem, {
      foreignKey: "portfolioId",
      as: "items",
    });

    Portfolio.hasMany(models.AnalysisRun, {
      foreignKey: "portfolioId",
      as: "analysisRuns",
    });
  }
}

Portfolio.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "file_name",
    },
  },
  {
    sequelize,
    tableName: "portfolios",
    timestamps: true,
    underscored: true,
  },
);
