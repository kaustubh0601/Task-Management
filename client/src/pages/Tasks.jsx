import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import TaskList from '../components/tasks/TaskList';

const Tasks = ({ showCreateForm = false }) => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-gray-200 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage and track all your tasks in one place
              </p>
            </div>
          </div>
        </div>

        {/* Task List Component */}
        <TaskList showCreateForm={showCreateForm} />
      </div>
    </DashboardLayout>
  );
};

export default Tasks;