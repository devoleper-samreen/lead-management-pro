'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api';
import { HRStats, Lead } from '@/types';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function HRDashboard() {
  const [stats, setStats] = useState<HRStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'leads'>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes] = await Promise.all([
        api.get('/hr/stats'),
        api.get(`/hr/leads?limit=100${statusFilter ? `&status=${statusFilter}` : ''}`),
      ]);

      setStats(statsRes.data.data.stats);
      setLeads(leadsRes.data.data.leads);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openUpdateModal = (lead: Lead) => {
    setSelectedLead(lead);
    setUpdateStatus(lead.status);
    setUpdateNotes(lead.notes || '');
    setShowUpdateModal(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setUpdating(true);
    try {
      await api.put(`/hr/leads/${selectedLead._id}`, {
        status: updateStatus,
        notes: updateNotes,
      });
      toast.success('Lead updated successfully!');
      setShowUpdateModal(false);
      setSelectedLead(null);
      fetchData();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setUpdating(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.phone.includes(query) ||
      (lead.company && lead.company.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['hr']}>
        <LoadingSpinner size="lg" />
      </DashboardLayout>
    );
  }

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#6b7280'];

  const statusData = stats ? [
    { name: 'Pending', value: stats.pending },
    { name: 'Contacted', value: stats.contacted },
    { name: 'Converted', value: stats.converted },
    { name: 'Rejected', value: stats.rejected },
    { name: 'Not Reachable', value: stats.notReachable },
  ] : [];

  return (
    <DashboardLayout allowedRoles={['hr']}>
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          {['overview', 'leads'].map((tab) => (
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
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatsCard
              title="Total Leads"
              value={stats.totalLeads}
              color="blue"
            />
            <StatsCard
              title="Pending"
              value={stats.pending}
              color="yellow"
            />
            <StatsCard
              title="Contacted"
              value={stats.contacted}
              color="blue"
            />
            <StatsCard
              title="Converted"
              value={stats.converted}
              color="green"
            />
            <StatsCard
              title="Conversion Rate"
              value={`${stats.conversionRate}%`}
              color="green"
            />
          </div>

          {/* Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status Distribution</h3>
              {stats.totalLeads > 0 ? (
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
                  <p className="text-sm font-medium">No leads assigned yet</p>
                  <p className="text-xs mt-1">Leads will appear here once assigned by admin</p>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Total Assigned Leads</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.totalLeads}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Successfully Converted</span>
                  <span className="text-2xl font-bold text-green-600">{stats.converted}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Currently Contacted</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.contacted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-semibold">Conversion Rate</span>
                  <span className="text-3xl font-bold text-green-600">{stats.conversionRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setStatusFilter('pending');
                  setActiveTab('leads');
                }}
                className="p-4 border-2 border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors"
              >
                <div className="text-yellow-600 font-semibold mb-1">View Pending Leads</div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
              </button>
              <button
                onClick={() => {
                  setStatusFilter('contacted');
                  setActiveTab('leads');
                }}
                className="p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="text-blue-600 font-semibold mb-1">View Contacted Leads</div>
                <div className="text-2xl font-bold text-gray-900">{stats.contacted}</div>
              </button>
              <button
                onClick={() => {
                  setStatusFilter('converted');
                  setActiveTab('leads');
                }}
                className="p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
              >
                <div className="text-green-600 font-semibold mb-1">View Converted Leads</div>
                <div className="text-2xl font-bold text-gray-900">{stats.converted}</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900">My Leads</h2>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="Search leads..."
                className="input max-w-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="input max-w-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="rejected">Rejected</option>
                <option value="not_reachable">Not Reachable</option>
              </select>
            </div>
          </div>

          <div className="card">
            {filteredLeads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Company</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id}>
                        <td className="font-medium">{lead.name}</td>
                        <td>{lead.email}</td>
                        <td>{lead.phone}</td>
                        <td>{lead.company || '-'}</td>
                        <td>{lead.position || '-'}</td>
                        <td>
                          <span className={`badge badge-${lead.status.replace('_', '-')}`}>
                            {lead.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => openUpdateModal(lead)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Update
                          </button>
                        </td>
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
                <p className="text-sm font-medium">{searchQuery || statusFilter ? 'No leads match your filters' : 'No leads assigned yet'}</p>
                <p className="text-xs mt-1">{searchQuery || statusFilter ? 'Try adjusting your search or filters' : 'Leads will appear once assigned by admin'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Lead Modal */}
      {showUpdateModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Lead</h3>
            <form onSubmit={handleUpdateLead} className="space-y-4">
              <div>
                <label className="label">Lead Name</label>
                <input
                  type="text"
                  value={selectedLead.name}
                  disabled
                  className="input bg-gray-50"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={selectedLead.email}
                  disabled
                  className="input bg-gray-50"
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                  <option value="rejected">Rejected</option>
                  <option value="not_reachable">Not Reachable</option>
                </select>
              </div>
              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Lead'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedLead(null);
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
    </DashboardLayout>
  );
}
