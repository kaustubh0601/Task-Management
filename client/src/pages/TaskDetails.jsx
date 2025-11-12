import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { tasksAPI } from '../services/api';

const TaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getTask(taskId);
      const taskData = response.data.data?.task || response.data.task || response.data;
      setTask(taskData);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setError('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await tasksAPI.updateTask(taskId, { status: newStatus });
      setTask(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const PriorityBadge = ({ priority }) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
    };

    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${colors[priority]}`}>
        <span className="mr-2">{icons[priority]}</span>
        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };

    const icons = {
      pending: '⏳',
      'in-progress': '🔄',
      completed: '✅',
      cancelled: '❌'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${colors[status]}`}>
        <span className="mr-2">{icons[status]}</span>
        {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading task details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !task) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The task you are looking for does not exist.'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 flex items-center"
          >
            ← Back
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={() => navigate(`/tasks`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Edit Task
            </button>
          )}
        </div>

        {/* Task Details Card */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  {isOverdue && (
                    <span className="bg-red-100 text-red-800 border border-red-200 px-3 py-1 text-sm font-medium rounded-full">
                      🚨 Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {task.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Status Update for Users */}
                {user?.role === 'user' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Update Status</h3>
                    <div className="flex gap-2">
                      {['pending', 'in-progress', 'completed'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(status)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            task.status === status
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          disabled={task.status === 'completed' && status !== 'completed'}
                        >
                          {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Task Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Task Information</h3>
                  
                  <div className="space-y-3 text-sm">
                    {/* Assigned To */}
                    <div>
                      <span className="text-gray-500 block mb-1">Assigned To</span>
                      {task.assignedTo ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {task.assignedTo.firstName} {task.assignedTo.lastName}
                          </div>
                          <div className="text-gray-500">{task.assignedTo.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Unassigned</span>
                      )}
                    </div>

                    {/* Created By */}
                    {task.createdBy && (
                      <div>
                        <span className="text-gray-500 block mb-1">Created By</span>
                        <div className="font-medium text-gray-900">
                          {task.createdBy.firstName} {task.createdBy.lastName}
                        </div>
                      </div>
                    )}

                    {/* Due Date */}
                    <div>
                      <span className="text-gray-500 block mb-1">Due Date</span>
                      {task.dueDate ? (
                        <div className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {new Date(task.dueDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {isOverdue && <span className="block text-xs text-red-600">Overdue</span>}
                        </div>
                      ) : (
                        <span className="text-gray-500">No due date set</span>
                      )}
                    </div>

                    {/* Created Date */}
                    <div>
                      <span className="text-gray-500 block mb-1">Created</span>
                      <div className="text-gray-900">
                        {new Date(task.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* Updated Date */}
                    <div>
                      <span className="text-gray-500 block mb-1">Last Updated</span>
                      <div className="text-gray-900">
                        {new Date(task.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    {user?.role === 'user' ? (
                      // User actions
                      <>
                        <button 
                          onClick={() => navigate('/dashboard')}
                          className="w-full text-left text-blue-600 hover:text-blue-700 text-sm"
                        >
                          📊 Go to Dashboard
                        </button>
                        <button 
                          onClick={() => navigate('/priorities')}
                          className="w-full text-left text-blue-600 hover:text-blue-700 text-sm"
                        >
                          🎯 View Priority Lists
                        </button>
                      </>
                    ) : (
                      // Admin actions
                      <>
                        <button 
                          onClick={() => navigate('/tasks')}
                          className="w-full text-left text-blue-600 hover:text-blue-700 text-sm"
                        >
                          📋 View All Tasks
                        </button>
                        <button 
                          onClick={() => navigate('/priorities')}
                          className="w-full text-left text-blue-600 hover:text-blue-700 text-sm"
                        >
                          🎯 Priority Lists
                        </button>
                        <button 
                          onClick={() => navigate('/users')}
                          className="w-full text-left text-blue-600 hover:text-blue-700 text-sm"
                        >
                          👥 Manage Users
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TaskDetails;