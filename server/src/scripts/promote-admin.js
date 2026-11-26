import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import { ENV } from '../config/env.js';
import { AuditLog, User } from '../models/index.js';

export class AdminPromotionError extends Error {}

export class UserNotFoundError extends AdminPromotionError {
  constructor() {
    super('User not found.');
  }
}

export async function promoteAdmin(email) {
  const normalizedEmail = email.trim().toLowerCase();
  let user;
  try {
    user = await User.findOne({ email: normalizedEmail });
  } catch {
    throw new AdminPromotionError('Could not look up the target account.');
  }
  if (!user) {
    throw new UserNotFoundError();
  }

  const previousState = {
    role: user.role,
    accountStatus: user.accountStatus,
    isVerified: user.isVerified,
  };
  user.role = 'admin';
  user.accountStatus = 'active';
  user.isVerified = true;
  try {
    await user.save();
  } catch {
    throw new AdminPromotionError('Could not update the target account.');
  }

  try {
    const auditActor = await User.findOne({ role: 'admin', accountStatus: 'active' }).select('_id');
    await AuditLog.create({
      actorId: auditActor?._id || user._id,
      action: 'user.admin_promoted',
      targetType: 'user',
      targetId: user._id,
      meta: {
        source: 'cli',
        previousState,
        role: user.role,
        accountStatus: user.accountStatus,
        isVerified: user.isVerified,
      },
    });
  } catch {
    throw new AdminPromotionError('Account was updated, but its audit log entry could not be written.');
  }

  return user;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  let connected = false;
  try {
    const email = process.argv[2];
    if (!email || !email.includes('@')) {
      throw new Error('Usage: node src/scripts/promote-admin.js <email>');
    }

    await mongoose.connect(ENV.MONGO_URI);
    connected = true;
    await promoteAdmin(email);
    console.log('User promoted to admin.');
  } catch (error) {
    if (error instanceof AdminPromotionError) console.error(error.message);
    else if (error.message === 'Usage: node src/scripts/promote-admin.js <email>') console.error(error.message);
    else if (!connected) console.error('Could not connect to the configured database.');
    else console.error('Promotion did not complete; verify the target account and database state.');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
