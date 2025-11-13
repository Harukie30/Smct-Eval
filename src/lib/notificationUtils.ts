import clientDataService from './clientDataService';

// Utility functions for creating notifications based on user actions

export const createEvaluationNotification = async (employeeName: string, evaluatorName: string, employeeId?: number, employeeEmail?: string) => {
  // Notify evaluators and HR
  await clientDataService.createNotification({
    message: `New evaluation submitted for ${employeeName}`,
    type: 'info',
    roles: ['manager', 'evaluator', 'hr', 'admin'],
    actionUrl: '/evaluator?tab=feedback' // Navigate to evaluator feedback tab
  });

  // Notify the employee (for regular employees with role 'employee')
  await clientDataService.createNotification({
    message: `Your evaluation has been completed by ${evaluatorName} and is awaiting approval`,
    type: 'success',
    roles: ['employee'],
    actionUrl: '/employee-dashboard?tab=overview' // Navigate to employee overview tab
  });

  // Note: Managers (branch managers, area managers, etc.) don't need notifications
  // because they can see their evaluations in the Performance Reviews and Evaluation History tabs
};

export const createApprovalNotification = async (employeeName: string, approverName: string, approverType: 'employee' | 'evaluator') => {
  try {
    // Notify HR and Admin when either employee or evaluator approves
    await clientDataService.createNotification({
      message: `Evaluation for ${employeeName} approved by ${approverName} (${approverType})`,
      type: 'success',
      roles: ['hr', 'admin'],
      actionUrl: '/hr-dashboard?tab=evaluations'
    });

    // If evaluator approved, also notify the employee
    if (approverType === 'evaluator') {
      await clientDataService.createNotification({
        message: `Your evaluation has been approved by ${approverName}`,
        type: 'success',
        roles: ['employee'],
        actionUrl: '/employee-dashboard?tab=overview'
      });
    }
  } catch (error) {
    console.error('Failed to create approval notification:', error);
  }
};

export const createFullyApprovedNotification = async (employeeName: string) => {
  try {
    // Notify HR and Admin when evaluation is fully approved
    await clientDataService.createNotification({
      message: `Evaluation for ${employeeName} is now fully approved by both parties!`,
      type: 'success',
      roles: ['hr', 'admin'],
      actionUrl: '/hr-dashboard'
    });

    // Notify the employee separately with correct URL
    await clientDataService.createNotification({
      message: `Your evaluation is now fully approved by both parties!`,
      type: 'success',
      roles: ['employee'],
      actionUrl: '/employee-dashboard?tab=overview'
    });

    // Notify evaluators and managers separately
    await clientDataService.createNotification({
      message: `Evaluation for ${employeeName} has been fully approved and completed!`,
      type: 'success',
      roles: ['evaluator', 'manager'],
      actionUrl: '/evaluator?tab=feedback'
    });
  } catch (error) {
    console.error('Failed to create fully approved notification:', error);
  }
};

export const createSystemNotification = async (message: string, roles: string[] = ['admin']) => {
  await clientDataService.createNotification({
    message,
    type: 'info',
    roles,
    actionUrl: '/admin'
  });
};

export const createWarningNotification = async (message: string, roles: string[] = ['admin']) => {
  await clientDataService.createNotification({
    message,
    type: 'warning',
    roles,
    actionUrl: '/admin'
  });
};

export const createEmployeeNotification = async (message: string, employeeRole: string = 'employee', tab: string = 'overview') => {
  await clientDataService.createNotification({
    message,
    type: 'info',
    roles: [employeeRole],
    actionUrl: `/employee-dashboard?tab=${tab}`
  });
};

// Example usage in components:
/*
// When an evaluation is submitted
await createEvaluationNotification('John Smith', 'Sarah Johnson');

// When an evaluation is approved
await createApprovalNotification('John Smith', 'Sarah Johnson');

// System notifications
await createSystemNotification('System maintenance scheduled for tonight');
await createWarningNotification('Database backup failed');

// Employee notifications
await createEmployeeNotification('Your quarterly evaluation is due next week');
*/
