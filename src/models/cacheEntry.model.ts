import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class CacheEntry extends Model {
  public key!: string;
  public value!: unknown;
  public expiresAt!: Date;
}

CacheEntry.init(
  {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
  },
  {
    sequelize,
    tableName: "cache_entries",
    timestamps: true,
    underscored: true,
  },
);
