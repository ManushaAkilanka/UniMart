import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/testDB.js';
import { AuditLog, User } from '../models/index.js';
import { approveStudent } from '../scripts/approve-student.js';

describe('Manual student approval', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it('activates and verifies only the selected student and records an audit event', async () => {
    const student = await User.create({
      fullName: 'Pending Student',
      email: 'pending.student@example.com',
      googleId: 'pending-student-google-id',
      accountStatus: 'pending_approval',
      isVerified: false,
    });
    const otherStudent = await User.create({
      fullName: 'Other Pending Student',
      email: 'other.pending@example.com',
      googleId: 'other-pending-google-id',
      accountStatus: 'pending_approval',
      isVerified: false,
    });

    const approved = await approveStudent(student.email);

    expect(approved.role).toBe('student');
    expect(approved.accountStatus).toBe('active');
    expect(approved.isVerified).toBe(true);
    const untouched = await User.findById(otherStudent._id);
    expect(untouched.accountStatus).toBe('pending_approval');
    expect(untouched.isVerified).toBe(false);
    await expect(
      AuditLog.findOne({ targetId: student._id, action: 'user.student_approved_via_cli' })
    ).resolves.toMatchObject({ meta: { source: 'cli' } });
  });

  it('rejects unknown, non-student, and suspended accounts', async () => {
    await expect(approveStudent('missing@example.com')).rejects.toThrow('User not found.');

    const admin = await User.create({
      fullName: 'Existing Admin',
      email: 'existing.admin@example.com',
      googleId: 'existing-admin-google-id',
      role: 'admin',
    });
    await expect(approveStudent(admin.email)).rejects.toThrow('not a student');

    const suspended = await User.create({
      fullName: 'Suspended Student',
      email: 'suspended.student@example.com',
      googleId: 'suspended-student-google-id',
      isSuspended: true,
    });
    await expect(approveStudent(suspended.email)).rejects.toThrow('suspended');
  });
});
