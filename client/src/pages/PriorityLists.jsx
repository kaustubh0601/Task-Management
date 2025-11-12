import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { tasksAPI } from '../services/api';

const PriorityLists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasksByPriority, setTasksByPriority] = useState({
    urgent: [],
    high: [],
    medium: [],
    low: []
  });
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);

  useEffect(() => {
    fetchTasksByPriority();
  }, []);

  const fetchTasksByPriority = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks based on user role
      const params = { 
        sortBy: 'dueDate',
        sortOrder: 'asc',
        limit: 1000
      };
      
      // For regular users, only fetch their assigned tasks
      if (user?.role === 'user') {
        params.assignedToMe = true;
      }
      
      const response = await tasksAPI.getTasks(params);
      
      const data = response.data;
      const allTasks = data.data?.tasks || data.tasks || [];
      
      // Group tasks by priority and filter out completed/cancelled
      const tasksByPriorityNew = {
        urgent: [],
        high: [],
        medium: [],
        low: []
      };
      
      allTasks.forEach(task => {
        // Only show non-completed tasks in priority lists
        if (task.status !== 'completed' && task.status !== 'cancelled') {
          if (tasksByPriorityNew[task.priority]) {
            tasksByPriorityNew[task.priority].push(task);
          }
        }
      });

      setTasksByPriority(tasksByPriorityNew);
      console.log('Tasks by priority:', tasksByPriorityNew); // Debug log
    } catch (error) {
      console.error('Error fetching tasks by priority:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await tasksAPI.updateTask(taskId, { status: newStatus });
      fetchTasksByPriority(); // Refresh tasks
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const handlePriorityUpdate = async (taskId, newPriority) => {
    try {
      await tasksAPI.updateTask(taskId, { priority: newPriority });
      fetchTasksByPriority(); // Refresh tasks
    } catch (error) {
      console.error('Error updating task priority:', error);
      alert('Failed to update task priority');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    
    // Add visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    // Reset visual feedback
    e.target.style.opacity = '1';
    setDraggedTask(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
  };

  const handleDrop = (e, newPriority) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
    
    if (draggedTask && draggedTask.priority !== newPriority) {
      console.log(`Moving task "${draggedTask.title}" from ${draggedTask.priority} to ${newPriority}`);
      handlePriorityUpdate(draggedTask._id, newPriority);
    }
    setDraggedTask(null);
  };

  const PriorityColumn = ({ priority, title, tasks, bgColor, borderColor, textColor }) => (
    <div 
      className={`bg-white rounded-lg border-2 ${borderColor} min-h-[500px] transition-colors duration-200`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, priority)}
    >
      {/* Column Header */}
      <div className={`p-4 border-b ${borderColor} ${bgColor}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${textColor} flex items-center`}>
            <span className="mr-2">
              {priority === 'urgent' && '🔴'}
              {priority === 'high' && '🟠'} 
              {priority === 'medium' && '🟡'}
              {priority === 'low' && '🟢'}
            </span>
            {title}
          </h3>
          <span className={`px-2 py-1 text-xs font-medium ${bgColor} ${textColor} rounded-full`}>
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-4 space-y-3">
        {tasks.length > 0 ? tasks.map((task) => (
          <TaskCard 
            key={task._id} 
            task={task} 
            onStatusUpdate={handleStatusUpdate}
            onDragStart={handleDragStart}
          />
        )) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-sm">No {priority} priority tasks</p>
          </div>
        )}
      </div>
    </div>
  );

  const TaskCard = ({ task, onStatusUpdate, onDragStart }) => {
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <div
        draggable={user?.role === 'admin'}
        onDragStart={user?.role === 'admin' ? (e) => onDragStart(e, task) : undefined}
        onDragEnd={user?.role === 'admin' ? handleDragEnd : undefined}
        className={`bg-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 select-none ${
          user?.role === 'admin' ? 'cursor-move' : 'cursor-default'
        }`}
        title={user?.role === 'admin' ? "Drag to move between priority columns" : "Task details"}
      >
        {/* Task Title */}
        <h4 className="font-medium text-gray-900 mb-2 truncate">{task.title}</h4>
        
        {/* Task Description */}
        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Task Meta */}
        <div className="space-y-2">
          {/* Due Date */}
          {task.dueDate && (
            <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              📅 {isOverdue && 'OVERDUE: '}{new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}

          {/* Assigned To */}
          {task.assignedTo && (
            <div className="text-xs text-gray-500">
              👤 {task.assignedTo.firstName} {task.assignedTo.lastName}
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <StatusBadge status={task.status} />
            <div className="flex space-x-1">
              {user?.role === 'user' ? (
                // Regular users get a "View Details" button
                <button
                  onClick={() => navigate(`/task/${task._id}`)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors duration-200"
                  title="View Details"
                >
                  👁️
                </button>
              ) : (
                // Admin users get status update buttons
                <>
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => onStatusUpdate(task._id, 'completed')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors duration-200"
                      title="Mark as Complete"
                    >
                      ✓
                    </button>
                  )}
                  {task.status !== 'in-progress' && task.status !== 'completed' && (
                    <button
                      onClick={() => onStatusUpdate(task._id, 'in-progress')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors duration-200"
                      title="Start Task"
                    >
                      ▶
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };

    const icons = {
      pending: '⏳',
      'in-progress': '🔄',
      completed: '✅',
      cancelled: '❌'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        <span className="mr-1">{icons[status]}</span>
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
            <p className="mt-2 text-gray-600">Loading priority lists...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-gray-200 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.role === 'admin' ? 'Priority Lists' : 'My Priority Tasks'}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {user?.role === 'admin' 
                  ? 'Organize tasks by priority levels. Drag and drop to change priority.'
                  : 'View your assigned tasks organized by priority levels.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Priority Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <PriorityColumn
            priority="urgent"
            title="Urgent"
            tasks={tasksByPriority.urgent}
            bgColor="bg-red-50"
            borderColor="border-red-200"
            textColor="text-red-700"
          />
          <PriorityColumn
            priority="high"
            title="High"
            tasks={tasksByPriority.high}
            bgColor="bg-orange-50"
            borderColor="border-orange-200"
            textColor="text-orange-700"
          />
          <PriorityColumn
            priority="medium"
            title="Medium"
            tasks={tasksByPriority.medium}
            bgColor="bg-yellow-50"
            borderColor="border-yellow-200"
            textColor="text-yellow-700"
          />
          <PriorityColumn
            priority="low"
            title="Low"
            tasks={tasksByPriority.low}
            bgColor="bg-green-50"
            borderColor="border-green-200"
            textColor="text-green-700"
          />
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="shrink-0">
              <span className="text-blue-400 text-xl">💡</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                How to use Priority Lists:
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Tasks are organized by priority: Urgent (🔴), High (🟠), Medium (🟡), Low (🟢)</li>
                  <li>Drag and drop tasks between columns to change their priority</li>
                  <li>Use the status buttons to mark tasks as in-progress (▶) or complete (✓)</li>
                  <li>Overdue tasks are highlighted in red</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PriorityLists;