import dns from 'dns';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import { ENV } from '../config/env.js';
import { AuditLog, User } from '../models/index.js';

export class StudentApprovalError extends Error {}

export async function approveStudent(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new StudentApprovalError('User not found.');
  }
  if (user.role !== 'student') {
    throw new StudentApprovalError('Target account is not a student; no changes made.');
  }
  if (user.isSuspended) {
    throw new StudentApprovalError('Target account is suspended; no changes made.');
  }

  const previousState = {
    accountStatus: user.accountStatus,
    isVerified: user.isVerified,
  };
  user.accountStatus = 'active';
  user.isVerified = true;
  await user.save();

  const auditActor = await User.findOne({
    email: ENV.ADMIN_EMAIL.toLowerCase(),
    role: 'admin',
    accountStatus: 'active',
  }).select('_id');
  await AuditLog.create({
    actorId: auditActor?._id || user._id,
    action: 'user.student_approved_via_cli',
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

  return user;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  let connected = false;
  try {
    const email = process.argv[2];
    if (!email || !email.includes('@')) {
      throw new StudentApprovalError('Usage: node src/scripts/approve-student.js <email>');
    }

    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // Use the system DNS resolver when custom DNS configuration is unavailable.
    }
    await mongoose.connect(ENV.MONGO_URI);
    connected = true;
    await approveStudent(email);
    console.log('Student account is active and verified.');
  } catch (error) {
    if (error instanceof StudentApprovalError) console.error(error.message);
    else if (!connected) console.error('Could not connect to the configured database.');
    else console.error('Approval did not complete; verify the target account and database state.');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
