import clientDataService from './clientDataService';

// Utility functions for creating notifications based on user actions

export const createEvaluationNotification = async (employeeName: string, evaluatorName: string) => {
  // Notify evaluators and HR
  await clientDataService.createNotification({
    message: `New evaluation submitted for ${employeeName}`,
    type: 'info',
    roles: ['manager', 'evaluator', 'hr', 'hr-manager'],
    actionUrl: '/evaluator' // Navigate to evaluator dashboard
  });

  // Notify the employee
  await clientDataService.createNotification({
    message: `Your evaluation has been completed by ${evaluatorName} and is awaiting approval`,
    type: 'success',
    roles: ['employee'],
    actionUrl: '/employee-dashboard' // Navigate to employee dashboard
  });
};

export const createApprovalNotification = async (employeeName: string, approverName: string, approverType: 'employee' | 'evaluator') => {
  try {
    // Notify HR and Admin when either employee or evaluator approves
    await clientDataService.createNotification({
      message: `Evaluation for ${employeeName} approved by ${approverName} (${approverType})`,
      type: 'success',
      roles: ['hr', 'hr-manager', 'admin'],
      actionUrl: '/hr-dashboard'
    });

    // If evaluator approved, also notify the employee
    if (approverType === 'evaluator') {
      await clientDataService.createNotification({
        message: `Your evaluation has been approved by ${approverName}`,
        type: 'success',
        roles: ['employee'],
        actionUrl: '/employee-dashboard'
      });
    }
  } catch (error) {
    console.error('Failed to create approval notification:', error);
  }
};

export const createFullyApprovedNotification = async (employeeName: string) => {
  try {
    // Notify HR, Admin, and Employee when evaluation is fully approved
    await clientDataService.createNotification({
      message: `Evaluation for ${employeeName} is now fully approved by both parties!`,
      type: 'success',
      roles: ['hr', 'hr-manager', 'admin', 'employee'],
      actionUrl: '/hr-dashboard'
    });

    // Notify evaluators and managers separately
    await clientDataService.createNotification({
      message: `Evaluation for ${employeeName} has been fully approved and completed!`,
      type: 'success',
      roles: ['evaluator', 'manager'],
      actionUrl: '/evaluator'
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

export const createEmployeeNotification = async (message: string, employeeRole: string = 'employee') => {
  await clientDataService.createNotification({
    message,
    type: 'info',
    roles: [employeeRole],
    actionUrl: '/employee-dashboard'
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
