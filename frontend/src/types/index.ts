export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'team_leader' | 'hr';
  phone?: string;
  teamLeader?: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  position?: string;
  source: string;
  status: 'pending' | 'contacted' | 'converted' | 'rejected' | 'not_reachable';
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  notes?: string;
  lastContactedAt?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  totalLeads: number;
  unassignedLeads: number;
  statusCounts: {
    pending: number;
    contacted: number;
    converted: number;
    rejected: number;
    not_reachable: number;
  };
  userCounts: {
    admin: number;
    teamLeader: number;
    hr: number;
  };
  hrDistribution: Array<{
    hrUser: {
      _id: string;
      name: string;
      email: string;
    };
    totalLeads: number;
    converted: number;
    contacted: number;
    rejected: number;
    conversionRate: number;
  }>;
}

export interface TeamAnalytics {
  totalHRUsers: number;
  totalLeads: number;
  statusCounts: {
    pending: number;
    contacted: number;
    converted: number;
    rejected: number;
    not_reachable: number;
  };
  hrPerformance: Array<{
    hrUser: {
      _id: string;
      name: string;
      email: string;
    };
    totalLeads: number;
    converted: number;
    contacted: number;
    pending: number;
    conversionRate: number;
  }>;
}

export interface HRStats {
  totalLeads: number;
  pending: number;
  contacted: number;
  converted: number;
  rejected: number;
  notReachable: number;
  conversionRate: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
  results?: number;
}
