import React, { useState, useEffect, useCallback } from 'react';
import { tasksAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TaskForm from './TaskForm';

const TaskList = ({ showCreateForm = false }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(showCreateForm);
  const [editingTask, setEditingTask] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTasks: 0,
    limit: 10
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    assignedTo: ''
  });

  // Sort states
  const [sort, setSort] = useState({
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
        ...filters
      };

      // For regular users, only show their assigned tasks
      if (user?.role === 'user') {
        params.assignedToMe = true;
      }

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await tasksAPI.getTasks(params);
      const data = response.data;
      
      setTasks(data.data?.tasks || data.tasks || []);
      setPagination(prev => ({
        ...prev,
        totalPages: data.data?.totalPages || data.totalPages || 1,
        totalTasks: data.data?.totalTasks || data.totalTasks || 0
      }));
      
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, sort.sortBy, sort.sortOrder, filters, user?.role]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (showCreateForm) {
      setEditingTask(null);
      setShowTaskForm(true);
    }
  }, [showCreateForm]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSortChange = (sortBy) => {
    setSort(prev => ({
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await tasksAPI.updateTask(taskId, { status: newStatus });
      fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksAPI.deleteTask(taskId);
        fetchTasks(); // Refresh tasks
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task');
      }
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskFormSubmit = (taskData) => {
    console.log('Task form submitted:', taskData); // Use the parameter
    setShowTaskForm(false);
    setEditingTask(null);
    fetchTasks(); // Refresh tasks
  };

  const handleTaskFormCancel = () => {
    setShowTaskForm(false);
    setEditingTask(null);
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
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${colors[priority]}`}>
        <span className="mr-1">{icons[priority]}</span>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
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
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${colors[status]}`}>
        <span className="mr-1">{icons[status]}</span>
        {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const StatusDropdown = ({ task }) => {
    const statuses = [
      { value: 'pending', label: 'Pending' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ];

    return (
      <select
        value={task.status}
        onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
      >
        {statuses.map(status => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    );
  };

  const Pagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, pagination.currentPage - halfVisible);
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {(pagination.currentPage - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalTasks)}
              </span>{' '}
              of{' '}
              <span className="font-medium">{pagination.totalTasks}</span> results
            </p>
          </div>
          
          <div>
            <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              
              {pages.map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                    page === pagination.currentPage
                      ? 'bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header with Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-1">
              {user?.role === 'admin' ? 'All Tasks' : 'My Tasks'}
            </h2>
            <p className="text-sm text-gray-600">
              {user?.role === 'admin' 
                ? 'Manage all tasks in the system' 
                : 'Tasks assigned to you'
              }
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sort.sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="createdAt">Created Date</option>
              <option value="dueDate">Due Date</option>
              <option value="title">Title</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              {user?.role === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {user?.role === 'admin' ? 'Actions' : 'Status'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.length > 0 ? tasks.map((task) => (
              <tr key={task._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {task.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <PriorityBadge priority={task.priority} />
                </td>
                {user?.role === 'admin' && (
                  <td className="px-6 py-4">
                    <StatusDropdown task={task} />
                  </td>
                )}
                <td className="px-6 py-4 text-sm text-gray-900">
                  {task.assignedTo ? (
                    <div>
                      <div>{task.assignedTo.firstName} {task.assignedTo.lastName}</div>
                      <div className="text-gray-500">{task.assignedTo.email}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {task.dueDate ? (
                    <div className={`${
                      new Date(task.dueDate) < new Date() && task.status !== 'completed' 
                        ? 'text-red-600 font-medium' 
                        : ''
                    }`}>
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  ) : (
                    <span className="text-gray-500">No due date</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium space-x-2">
                  {user?.role === 'admin' ? (
                    // Admin can edit and delete
                    <>
                      <button 
                        onClick={() => handleEditTask(task)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    // Regular users can only update status
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                      disabled={task.status === 'completed'}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={user?.role === 'admin' ? "6" : "5"} className="px-6 py-8 text-center">
                  <div className="text-gray-400 text-4xl mb-2">📝</div>
                  <p className="text-gray-500">
                    {user?.role === 'admin' ? 'No tasks found' : 'No tasks assigned to you'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {Object.values(filters).some(f => f !== '') 
                      ? 'Try adjusting your filters'
                      : user?.role === 'admin' 
                        ? 'Create your first task to get started'
                        : 'Contact your admin to get tasks assigned'
                    }
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && <Pagination />}
      
      {/* Task Form Modal - Admin Only */}
      {user?.role === 'admin' && (
        <TaskForm
          isOpen={showTaskForm}
          task={editingTask}
          onSubmit={handleTaskFormSubmit}
          onCancel={handleTaskFormCancel}
        />
      )}
    </div>
  );
};

export default TaskList;