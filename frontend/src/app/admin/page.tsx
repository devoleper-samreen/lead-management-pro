'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api';
import { Analytics, User, Lead } from '@/types';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'leads' | 'upload'>('overview');

  // User creation state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'hr', phone: '', teamLeaderId: '' });

  // User edit state
  const [showEditUser, setShowEditUser] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  // User delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lead distribution state
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedHR, setSelectedHR] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, usersRes, leadsRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users'),
        api.get('/admin/leads?limit=100'),
      ]);

      setAnalytics(analyticsRes.data.data);
      setUsers(usersRes.data.data.users);
      setLeads(leadsRes.data.data.leads);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', newUser);
      toast.success('User created successfully!');
      setShowCreateUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'hr', phone: '', teamLeaderId: '' });
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      await api.put(`/admin/users/${editUser._id}`, {
        name: editUser.name,
        email: editUser.email,
        phone: editUser.phone,
        role: editUser.role,
        teamLeaderId: editUser.teamLeader?._id || null
      });
      toast.success('User updated successfully!');
      setShowEditUser(false);
      setEditUser(null);
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    setShowEditUser(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      await api.delete(`/admin/users/${deleteUserId}`);
      toast.success('User deleted successfully!');
      setShowDeleteConfirm(false);
      setDeleteUserId(null);
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const openDeleteConfirm = (userId: string) => {
    setDeleteUserId(userId);
    setShowDeleteConfirm(true);
  };

  const handleAssignHR = async (hrId: string, tlId: string) => {
    try {
      await api.put('/admin/assign-hr', {
        hrUserId: hrId,
        teamLeaderId: tlId,
      });
      toast.success('HR assigned to Team Leader successfully!');
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    setUploading(true);
    setUploadError(null);
    try {
      const response = await api.post('/admin/upload-leads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message);
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchData();
    } catch (error: any) {
      // Handle specific error for duplicate emails
      if (error?.response?.data?.message === 'No valid leads to import') {
        const errors = error.response.data.errors || [];
        const duplicateCount = errors.filter((e: any) => e.message.includes('already exists')).length;
        const missingFieldsCount = errors.length - duplicateCount;
        let errorMsg = '';

        if (duplicateCount > 0 && duplicateCount === errors.length) {
          errorMsg = `All ${duplicateCount} leads already exist in the database. Please upload leads with different email addresses.`;
        } else if (duplicateCount > 0 && missingFieldsCount > 0) {
          errorMsg = `${duplicateCount} leads already exist in the database and ${missingFieldsCount} leads have missing required fields.`;
        } else {
          errorMsg = 'All leads have missing required fields (name, email, or phone). Please check your file format.';
        }

        setUploadError(errorMsg);
        return; // Don't show toast, error is displayed on screen
      }
      // Other errors handled by interceptor
    } finally {
      setUploading(false);
    }
  };

  const handleDistributeLeads = async () => {
    if (selectedLeads.length === 0 || !selectedHR) {
      toast.error('Please select leads and an HR user');
      return;
    }

    try {
      await api.post('/admin/distribute-leads', {
        leadIds: selectedLeads,
        hrUserId: selectedHR,
      });
      toast.success('Leads distributed successfully!');
      setSelectedLeads([]);
      setSelectedHR('');
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <LoadingSpinner size="lg" />
      </DashboardLayout>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  const statusData = analytics ? [
    { name: 'Pending', value: analytics.statusCounts.pending },
    { name: 'Contacted', value: analytics.statusCounts.contacted },
    { name: 'Converted', value: analytics.statusCounts.converted },
    { name: 'Rejected', value: analytics.statusCounts.rejected },
    { name: 'Not Reachable', value: analytics.statusCounts.not_reachable },
  ] : [];

  const hrPerformanceData = analytics?.hrDistribution.map(hr => ({
    name: hr.hrUser.name,
    total: hr.totalLeads,
    converted: hr.converted,
    rate: hr.conversionRate,
  })) || [];

  const teamLeaders = users.filter(u => u.role === 'team_leader');
  const hrUsers = users.filter(u => u.role === 'hr');
  const unassignedLeads = leads.filter(l => !l.assignedTo);

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          {['overview', 'users', 'leads', 'upload'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Leads"
              value={analytics.totalLeads}
              color="blue"
              subtitle={`${analytics.unassignedLeads} unassigned`}
            />
            <StatsCard
              title="Converted"
              value={analytics.statusCounts.converted}
              color="green"
            />
            <StatsCard
              title="Pending"
              value={analytics.statusCounts.pending}
              color="yellow"
            />
            <StatsCard
              title="Total Users"
              value={users.length}
              color="purple"
              subtitle={`${hrUsers.length} HR users`}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Status Distribution */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status Distribution</h3>
              {analytics.totalLeads > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                  <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm font-medium">No leads data available</p>
                  <p className="text-xs mt-1">Upload leads to see the distribution</p>
                </div>
              )}
            </div>

            {/* HR Performance */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">HR Performance</h3>
              {hrPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hrPerformanceData.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" name="Total Leads" />
                    <Bar dataKey="converted" fill="#10b981" name="Converted" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                  <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm font-medium">No HR performance data</p>
                  <p className="text-xs mt-1">Assign leads to HR users to see performance</p>
                </div>
              )}
            </div>
          </div>

          {/* HR Distribution Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">HR Distribution</h3>
            {analytics.hrDistribution.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>HR User</th>
                      <th>Email</th>
                      <th>Total Leads</th>
                      <th>Converted</th>
                      <th>Contacted</th>
                      <th>Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.hrDistribution.map((hr) => (
                      <tr key={hr.hrUser._id}>
                        <td className="font-medium">{hr.hrUser.name}</td>
                        <td>{hr.hrUser.email}</td>
                        <td>{hr.totalLeads}</td>
                        <td><span className="badge badge-converted">{hr.converted}</span></td>
                        <td><span className="badge badge-contacted">{hr.contacted}</span></td>
                        <td className="font-semibold text-green-600">{hr.conversionRate.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-sm font-medium">No HR distribution data</p>
                <p className="text-xs mt-1">Create HR users and assign leads to see distribution</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <button
              onClick={() => setShowCreateUser(true)}
              className="btn btn-primary"
            >
              + Create User
            </button>
          </div>

          {showCreateUser && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Enter full name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      required
                      className="input"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input
                      type="password"
                      required
                      className="input"
                      placeholder="Min 6 characters"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="+1234567890"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select
                      className="input"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="team_leader">Team Leader</option>
                      <option value="hr">HR User</option>
                    </select>
                  </div>
                  {newUser.role === 'hr' && (
                    <div>
                      <label className="label">Team Leader (Optional)</label>
                      <select
                        className="input"
                        value={newUser.teamLeaderId}
                        onChange={(e) => setNewUser({ ...newUser, teamLeaderId: e.target.value })}
                      >
                        <option value="">Select Team Leader</option>
                        {teamLeaders.map((tl) => (
                          <option key={tl._id} value={tl._id}>
                            {tl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="btn btn-primary">Create User</button>
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">All Users</h3>
            {users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Team Leader</th>
                      <th>Status</th>
                      <th>Assign TL</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className="font-medium">{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`badge ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'team_leader' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{user.teamLeader?.name || '-'}</td>
                        <td>
                          <span className={`badge ${user.isActive ? 'badge-converted' : 'badge-rejected'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {user.role === 'hr' && !user.teamLeader && (
                            <select
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                              onChange={(e) => handleAssignHR(user._id, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Select TL</option>
                              {teamLeaders.map((tl) => (
                                <option key={tl._id} value={tl._id}>{tl.name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          {user.role !== 'admin' && (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openEditModal(user)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit user"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(user._id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Delete user"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-sm font-medium">No users found</p>
                <p className="text-xs mt-1">Click &quot;Create User&quot; to add team leaders or HR users</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Lead Management</h2>
            {selectedLeads.length > 0 && (
              <div className="flex items-center space-x-3">
                <select
                  className="input"
                  value={selectedHR}
                  onChange={(e) => setSelectedHR(e.target.value)}
                >
                  <option value="">Select HR User</option>
                  {hrUsers.map((hr) => (
                    <option key={hr._id} value={hr._id}>{hr.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleDistributeLeads}
                  className="btn btn-primary"
                >
                  Distribute {selectedLeads.length} Leads
                </button>
              </div>
            )}
          </div>

          <div className="card">
            {leads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeads(unassignedLeads.map(l => l._id));
                            } else {
                              setSelectedLeads([]);
                            }
                          }}
                          checked={selectedLeads.length === unassignedLeads.length && unassignedLeads.length > 0}
                        />
                      </th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 50).map((lead) => (
                      <tr key={lead._id}>
                        <td>
                          {!lead.assignedTo && (
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(lead._id)}
                              onChange={() => toggleLeadSelection(lead._id)}
                            />
                          )}
                        </td>
                        <td className="font-medium">{lead.name}</td>
                        <td>{lead.email}</td>
                        <td>{lead.phone}</td>
                        <td>{lead.company || '-'}</td>
                        <td>
                          <span className={`badge badge-${lead.status.replace('_', '-')}`}>
                            {lead.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{lead.assignedTo?.name || 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">No leads available</p>
                <p className="text-xs mt-1">Go to Upload tab to import leads from CSV/Excel</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload Leads</h2>

          <div className="card max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Upload CSV/Excel File</h3>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="label">Select File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] || null);
                    setUploadError(null);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Expected columns: name, email, phone, company (optional), position (optional)
                </p>
              </div>
              <button
                type="submit"
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  !uploadFile || uploading
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={!uploadFile || uploading}
              >
                {uploading ? (
                  <span className="flex items-center text-white">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  'Upload Leads'
                )}
              </button>

              {/* Error Display */}
              {uploadError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-red-800 mb-1">Upload Failed</h4>
                      <p className="text-sm text-red-700">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="card max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Sample CSV Format</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700">
{`name,email,phone,company,position
John Doe,john@example.com,+1234567890,ABC Corp,Manager
Jane Smith,jane@example.com,+0987654321,XYZ Inc,Director`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit User</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Enter full name"
                    value={editUser.name}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    required
                    className="input"
                    placeholder="user@example.com"
                    value={editUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+1234567890"
                    value={editUser.phone || ''}
                    onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select
                    className="input"
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value as any })}
                  >
                    <option value="team_leader">Team Leader</option>
                    <option value="hr">HR User</option>
                  </select>
                </div>
                {editUser.role === 'hr' && (
                  <div>
                    <label className="label">Team Leader</label>
                    <select
                      className="input"
                      value={editUser.teamLeader?._id || ''}
                      onChange={(e) => {
                        const selectedTL = teamLeaders.find(tl => tl._id === e.target.value);
                        setEditUser({ ...editUser, teamLeader: selectedTL });
                      }}
                    >
                      <option value="">Select Team Leader</option>
                      {teamLeaders.map((tl) => (
                        <option key={tl._id} value={tl._id}>
                          {tl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Update User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUser(false);
                    setEditUser(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete User</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteUser}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteUserId(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
