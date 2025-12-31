import User from '../models/User.model.js';
import Lead from '../models/Lead.model.js';

// @desc    Get assigned HR users
// @route   GET /api/team-leader/hr-users
// @access  Private/TeamLeader
export const getAssignedHRUsers = async (req, res) => {
  try {
    const hrUsers = await User.find({
      role: 'hr',
      teamLeader: req.user._id
    }).select('-password');

    // Get performance stats for each HR user
    const hrUsersWithStats = await Promise.all(
      hrUsers.map(async (hr) => {
        const stats = await Lead.aggregate([
          {
            $match: { assignedTo: hr._id }
          },
          {
            $group: {
              _id: null,
              totalLeads: { $sum: 1 },
              converted: {
                $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
              },
              contacted: {
                $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] }
              },
              pending: {
                $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
              },
              rejected: {
                $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
              },
              notReachable: {
                $sum: { $cond: [{ $eq: ['$status', 'not_reachable'] }, 1, 0] }
              }
            }
          }
        ]);

        const hrStats = stats[0] || {
          totalLeads: 0,
          converted: 0,
          contacted: 0,
          pending: 0,
          rejected: 0,
          notReachable: 0
        };

        return {
          ...hr.toObject(),
          stats: {
            ...hrStats,
            conversionRate: hrStats.totalLeads > 0
              ? ((hrStats.converted / hrStats.totalLeads) * 100).toFixed(2)
              : 0
          }
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: hrUsersWithStats.length,
      data: {
        hrUsers: hrUsersWithStats
      }
    });
  } catch (error) {
    console.error('Get assigned HR users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching HR users',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Get team performance analytics
// @route   GET /api/team-leader/analytics
// @access  Private/TeamLeader
export const getTeamAnalytics = async (req, res) => {
  try {
    // Get all HR users under this team leader
    const hrUsers = await User.find({
      role: 'hr',
      teamLeader: req.user._id
    });

    const hrUserIds = hrUsers.map(hr => hr._id);

    // Get total leads assigned to team
    const totalLeads = await Lead.countDocuments({
      assignedTo: { $in: hrUserIds }
    });

    // Status breakdown
    const statusBreakdown = await Lead.aggregate([
      {
        $match: { assignedTo: { $in: hrUserIds } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = {
      pending: 0,
      contacted: 0,
      converted: 0,
      rejected: 0,
      not_reachable: 0
    };

    statusBreakdown.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    // HR-wise performance
    const hrPerformance = await Lead.aggregate([
      {
        $match: { assignedTo: { $in: hrUserIds } }
      },
      {
        $group: {
          _id: '$assignedTo',
          totalLeads: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
          },
          contacted: {
            $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'hrUser'
        }
      },
      {
        $unwind: '$hrUser'
      },
      {
        $project: {
          hrUser: {
            _id: '$hrUser._id',
            name: '$hrUser.name',
            email: '$hrUser.email'
          },
          totalLeads: 1,
          converted: 1,
          contacted: 1,
          pending: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$totalLeads', 0] },
              { $multiply: [{ $divide: ['$converted', '$totalLeads'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalHRUsers: hrUsers.length,
        totalLeads,
        statusCounts,
        hrPerformance
      }
    });
  } catch (error) {
    console.error('Get team analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching team analytics',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Get leads filtered by team member
// @route   GET /api/team-leader/leads
// @access  Private/TeamLeader
export const getTeamLeads = async (req, res) => {
  try {
    const { hrUserId, status, search, page = 1, limit = 50 } = req.query;

    // Get all HR users under this team leader
    const hrUsers = await User.find({
      role: 'hr',
      teamLeader: req.user._id
    });

    const hrUserIds = hrUsers.map(hr => hr._id);

    let query = {
      assignedTo: { $in: hrUserIds }
    };

    // Filter by specific HR user
    if (hrUserId) {
      // Verify this HR user belongs to this team leader
      const hrUser = await User.findOne({
        _id: hrUserId,
        role: 'hr',
        teamLeader: req.user._id
      });

      if (!hrUser) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this HR user\'s leads'
        });
      }

      query.assignedTo = hrUserId;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Lead.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: leads.length,
      data: {
        leads,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get team leads error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching team leads',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

export default {
  getAssignedHRUsers,
  getTeamAnalytics,
  getTeamLeads
};
