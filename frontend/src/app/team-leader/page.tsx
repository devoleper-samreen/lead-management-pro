'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api';
import { TeamAnalytics, Lead } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function TeamLeaderDashboard() {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [hrUsers, setHRUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'leads'>('overview');
  const [selectedHR, setSelectedHR] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, hrUsersRes, leadsRes] = await Promise.all([
        api.get('/team-leader/analytics'),
        api.get('/team-leader/hr-users'),
        api.get('/team-leader/leads?limit=100'),
      ]);

      setAnalytics(analyticsRes.data.data);
      setHRUsers(hrUsersRes.data.data.hrUsers);
      setLeads(leadsRes.data.data.leads);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeadsByHR = async (hrId: string) => {
    setSelectedHR(hrId);
    try {
      const response = await api.get(`/team-leader/leads?hrUserId=${hrId}&limit=100`);
      setLeads(response.data.data.leads);
    } catch (error) {
      console.error('Error filtering leads:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['team_leader']}>
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

  const teamPerformanceData = analytics?.hrPerformance.map(hr => ({
    name: hr.hrUser.name,
    total: hr.totalLeads,
    converted: hr.converted,
    contacted: hr.contacted,
    pending: hr.pending,
  })) || [];

  return (
    <DashboardLayout allowedRoles={['team_leader']}>
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          {['overview', 'team', 'leads'].map((tab) => (
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
              title="Team Members"
              value={analytics.totalHRUsers}
              color="purple"
            />
            <StatsCard
              title="Total Leads"
              value={analytics.totalLeads}
              color="blue"
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
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Status Distribution */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Lead Status</h3>
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
                  <p className="text-sm font-medium">No team leads data</p>
                  <p className="text-xs mt-1">Leads will appear once assigned to your team</p>
                </div>
              )}
            </div>

            {/* Team Performance */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
              {teamPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" name="Total" />
                    <Bar dataKey="converted" fill="#10b981" name="Converted" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                  <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm font-medium">No team performance data</p>
                  <p className="text-xs mt-1">Performance metrics will show once HR users are assigned</p>
                </div>
              )}
            </div>
          </div>

          {/* Team Performance Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members Performance</h3>
            {analytics.hrPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>HR Member</th>
                      <th>Total Leads</th>
                      <th>Pending</th>
                      <th>Contacted</th>
                      <th>Converted</th>
                      <th>Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.hrPerformance.map((hr) => (
                      <tr key={hr.hrUser._id}>
                        <td className="font-medium">{hr.hrUser.name}</td>
                        <td>{hr.totalLeads}</td>
                        <td><span className="badge badge-pending">{hr.pending}</span></td>
                        <td><span className="badge badge-contacted">{hr.contacted}</span></td>
                        <td><span className="badge badge-converted">{hr.converted}</span></td>
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
                <p className="text-sm font-medium">No team members found</p>
                <p className="text-xs mt-1">Contact admin to assign HR users to your team</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>

          {hrUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hrUsers.map((hr) => (
                <div key={hr._id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{hr.name}</h3>
                      <p className="text-sm text-gray-500">{hr.email}</p>
                    </div>
                    <span className="badge badge-converted">Active</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Leads:</span>
                      <span className="font-semibold">{hr.stats.totalLeads}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Converted:</span>
                      <span className="font-semibold text-green-600">{hr.stats.converted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Contacted:</span>
                      <span className="font-semibold text-blue-600">{hr.stats.contacted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-semibold text-yellow-600">{hr.stats.pending}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Conversion Rate:</span>
                      <span className="font-bold text-green-600">{hr.stats.conversionRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium">No team members assigned</p>
                <p className="text-sm mt-2">Contact admin to get HR users assigned to your team</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Team Leads</h2>
            <select
              className="input max-w-xs"
              value={selectedHR}
              onChange={(e) => filterLeadsByHR(e.target.value)}
            >
              <option value="">All Team Members</option>
              {hrUsers.map((hr) => (
                <option key={hr._id} value={hr._id}>{hr.name}</option>
              ))}
            </select>
          </div>

          <div className="card">
            {leads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead._id}>
                        <td className="font-medium">{lead.name}</td>
                        <td>{lead.email}</td>
                        <td>{lead.phone}</td>
                        <td>{lead.company || '-'}</td>
                        <td>
                          <span className={`badge badge-${lead.status.replace('_', '-')}`}>
                            {lead.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{lead.assignedTo?.name || '-'}</td>
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
                <p className="text-sm font-medium">No leads found</p>
                <p className="text-xs mt-1">Leads will appear once assigned to your team members</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
