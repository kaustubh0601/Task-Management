import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [userTaskStats, setUserTaskStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // For regular users, fetch only their assigned tasks
      // For admins, fetch all tasks
      const params = user?.role === 'user' ? { assignedToMe: true } : {};
      
      const response = await tasksAPI.getTasks({ 
        limit: user?.role === 'admin' ? 5 : 10, // More tasks for users, less for admin recent view
        sortBy: 'createdAt', 
        sortOrder: 'desc',
        ...params
      });
      
      const tasks = response.data.data?.tasks || response.data.tasks || [];
      setRecentTasks(tasks);

      // For stats, get appropriate task counts
      let allTasks = [];
      if (user?.role === 'admin') {
        // Admin sees all tasks
        const allTasksResponse = await tasksAPI.getTasks({ limit: 1000 });
        allTasks = allTasksResponse.data.data?.tasks || allTasksResponse.data.tasks || [];
        
        // Fetch user task statistics for admin dashboard
        await fetchUserTaskStats(allTasks);
      } else {
        // User sees only their tasks
        const myTasksResponse = await tasksAPI.getTasks({ assignedToMe: true, limit: 1000 });
        allTasks = myTasksResponse.data.data?.tasks || myTasksResponse.data.tasks || [];
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const taskStats = {
        total: allTasks.length,
        pending: allTasks.filter(t => t.status === 'pending').length,
        inProgress: allTasks.filter(t => t.status === 'in-progress').length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        overdue: allTasks.filter(t => 
          t.status !== 'completed' && new Date(t.dueDate) < today
        ).length
      };

      setStats(taskStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty data on error
      setRecentTasks([]);
      setStats({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0
      });
    } finally {
      setLoading(false);
    }
  }, [user?.role]); // Add user?.role as dependency

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Add fetchDashboardData as dependency

  const fetchUserTaskStats = async (allTasks) => {
    try {
      const usersResponse = await usersAPI.getUsers();
      console.log('Full users response:', usersResponse); // Debug log
      
      // Fix: The API returns users in response.data.data.users
      const users = usersResponse.data?.data?.users || usersResponse.data?.users || [];
      console.log('Users array:', users); // Debug log
      
      if (!Array.isArray(users)) {
        console.error('Users is not an array:', users);
        setUserTaskStats([]);
        return;
      }
      
      const userStats = users.map(user => {
        const userTasks = allTasks.filter(task => 
          task.assignedTo && task.assignedTo._id === user._id
        );
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return {
          _id: user._id,
          name: user.fullName || `${user.firstName} ${user.lastName}` || user.username,
          email: user.email,
          role: user.role,
          totalTasks: userTasks.length,
          pending: userTasks.filter(t => t.status === 'pending').length,
          inProgress: userTasks.filter(t => t.status === 'in-progress').length,
          completed: userTasks.filter(t => t.status === 'completed').length,
          overdue: userTasks.filter(t => 
            t.status !== 'completed' && new Date(t.dueDate) < today
          ).length,
        };
      });
      
      console.log('User task stats:', userStats); // Debug log
      setUserTaskStats(userStats);
    } catch (error) {
      console.error('Error fetching user task stats:', error);
      setUserTaskStats([]);
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await tasksAPI.updateTask(taskId, { status: newStatus });
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const StatCard = ({ title, value, icon, color, bgColor }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const PriorityBadge = ({ priority }) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[priority]}`}>
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

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[status]}`}>
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
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-linear-to-r from-blue-500 to-blue-600 rounded-lg text-white p-6">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user?.firstName || user?.username}! 👋
          </h2>
          <p className="text-blue-100">
            Here's what's happening with your tasks today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Tasks"
            value={stats.total}
            icon="📊"
            color="text-gray-900"
            bgColor="bg-gray-100"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon="⏳"
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon="🔄"
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon="✅"
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            title="Overdue"
            value={stats.overdue}
            icon="🚨"
            color="text-red-600"
            bgColor="bg-red-100"
          />
        </div>

        {/* Role-based Content */}
        {user?.role === 'admin' ? (
          // Admin view: User Task Statistics Table
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">User Task Overview</h3>
              <p className="text-sm text-gray-600 mt-1">Task distribution and progress by user</p>
            </div>
            <div className="overflow-x-auto">
              {userTaskStats.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tasks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userTaskStats.map((userStat) => (
                      <tr key={userStat._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{userStat.name}</div>
                            <div className="text-sm text-gray-500">{userStat.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            userStat.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {userStat.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {userStat.totalTasks}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            {userStat.pending}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {userStat.inProgress}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            {userStat.completed}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {userStat.overdue > 0 ? (
                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              {userStat.overdue}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                              0
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">👥</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No User Data</h3>
                  <p className="text-gray-500">No users or task data available</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // User view: My Tasks Table
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">My Tasks</h3>
              <p className="text-sm text-gray-600 mt-1">Tasks assigned to you</p>
            </div>
            <div className="overflow-x-auto">
              {recentTasks.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTasks.map((task) => (
                      <tr key={task._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
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
                        <td className="px-6 py-4 text-sm">
                          <button 
                            onClick={() => navigate(`/task/${task._id}`)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-2">📝</div>
                  <p className="text-gray-500 mb-4">No tasks assigned to you yet</p>
                  <p className="text-sm text-gray-400">Contact your admin to get tasks assigned</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;