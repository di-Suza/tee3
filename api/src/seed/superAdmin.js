import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

import { connectDB, disconnectDB } from '../config/db.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { Roles } from '../shared/constants/roles.js';
import userRepository from '../modules/private/users/user.repository.js';

class SuperAdminSeeder {
  constructor(repository = userRepository) {
    this.repository = repository;
  }

  validateEnv() {
    if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
      throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required to seed super admin');
    }
  }

  async run() {
    this.validateEnv();

    const existingUser = await this.repository.findByEmail(env.SUPER_ADMIN_EMAIL);

    if (existingUser) {
      if (existingUser.role !== Roles.SUPER_ADMIN) {
        throw new Error(`User already exists with email ${env.SUPER_ADMIN_EMAIL}, but role is ${existingUser.role}`);
      }

      logger.info({ email: existingUser.email }, 'Super admin already exists');
      return existingUser;
    }

    const hashedPassword = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 10);

    const superAdmin = await this.repository.create({
      name: env.SUPER_ADMIN_NAME,
      email: env.SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: Roles.SUPER_ADMIN,
    });

    logger.info({ email: superAdmin.email }, 'Super admin created');
    return superAdmin;
  }
}

const seeder = new SuperAdminSeeder();
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    seeder.validateEnv();
    await connectDB();
    await seeder.run();
  } catch (error) {
    logger.error({ err: error }, 'Super admin seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

export { SuperAdminSeeder };
