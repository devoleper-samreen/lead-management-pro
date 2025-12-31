import Lead from '../models/Lead.model.js';

// @desc    Get assigned leads
// @route   GET /api/hr/leads
// @access  Private/HR
export const getMyLeads = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;

    let query = {
      assignedTo: req.user._id
    };

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
    console.error('Get my leads error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching leads',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Update lead status
// @route   PUT /api/hr/leads/:id
// @access  Private/HR
export const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['pending', 'contacted', 'converted', 'rejected', 'not_reachable'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be pending, contacted, converted, rejected, or not_reachable'
      });
    }

    // Find lead and verify ownership
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }

    // Verify this lead is assigned to the current HR user
    if (lead.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this lead'
      });
    }

    // Update lead
    lead.status = status;
    if (notes) {
      lead.notes = notes;
    }

    await lead.save();

    res.status(200).json({
      status: 'success',
      message: 'Lead status updated successfully',
      data: { lead }
    });
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating lead status',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Get my performance stats
// @route   GET /api/hr/stats
// @access  Private/HR
export const getMyStats = async (req, res) => {
  try {
    const stats = await Lead.aggregate([
      {
        $match: { assignedTo: req.user._id }
      },
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          contacted: {
            $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] }
          },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
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

    const myStats = stats[0] || {
      totalLeads: 0,
      pending: 0,
      contacted: 0,
      converted: 0,
      rejected: 0,
      notReachable: 0
    };

    // Calculate conversion rate
    const conversionRate = myStats.totalLeads > 0
      ? ((myStats.converted / myStats.totalLeads) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          ...myStats,
          conversionRate
        }
      }
    });
  } catch (error) {
    console.error('Get my stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching stats',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Get single lead details
// @route   GET /api/hr/leads/:id
// @access  Private/HR
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }

    // Verify this lead is assigned to the current HR user
    if (lead.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this lead'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { lead }
    });
  } catch (error) {
    console.error('Get lead by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching lead',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

export default {
  getMyLeads,
  updateLeadStatus,
  getMyStats,
  getLeadById
};
