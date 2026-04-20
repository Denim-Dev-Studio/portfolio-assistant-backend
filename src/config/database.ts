import { Sequelize } from 'sequelize';
import { env } from './index';
import { AppError } from '../errors/appError';

export const sequelize = new Sequelize(env.dbName, env.dbUser, env.dbPassword, {
  host: env.dbHost,
  port: env.dbPort,
  dialect: 'postgres',
  logging: false,
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
  } catch (error) {
    throw AppError.database('Database connection failed.', undefined, error);
  }
};