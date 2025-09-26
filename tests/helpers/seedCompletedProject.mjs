export function seedCompletedProject({
  id = 101,
  name = 'Completed X',
  extra = {}
} = {}, checks = {}) {
  // Build a project that meets all predicates:
  const p = { id, name, ...extra };

  // If archiveProject checks project.status === 'completed':
  if (checks.needsStatusCompleted) p.status = 'completed';
  // If it checks project.createdBy === currentUser:
  if (checks.needsCreatedBy) p.createdBy = checks.currentUserId;
  // If it checks assigned users:
  if (checks.needsAssignedUsers) p.assignedTo = [checks.currentUserId];

  return p;
}
