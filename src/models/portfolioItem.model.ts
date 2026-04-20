import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class PortfolioItem extends Model {
  public id!: string;
  public portfolioId!: string;
  public symbol!: string;
  public quantity!: number;
  public avgPrice!: number;
  public currentPrice?: number;

  static associate(models: any) {
    PortfolioItem.belongsTo(models.Portfolio, {
      foreignKey: "portfolioId",
    });

    PortfolioItem.hasMany(models.HoldingAnalysis, {
      foreignKey: "portfolioItemId",
      as: "analyses",
    });
  }
}

PortfolioItem.init(
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
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    avgPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: "avg_price",
    },
    currentPrice: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: "current_price",
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "display_name",
    },
    isin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "portfolio_items",
    timestamps: true,
    underscored: true,
  },
);
