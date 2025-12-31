import User from '../models/User.model.js';
import Lead from '../models/Lead.model.js';
import xlsx from 'xlsx';
import fs from 'fs';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    let query = {};

    // Filter by role if provided
    if (role && ['admin', 'team_leader', 'hr'].includes(role)) {
      query.role = role;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('teamLeader', 'name email')
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Create a new user (Team Leader or HR)
// @route   POST /api/admin/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, teamLeaderId } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email, password, and role'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Validate role
    if (!['team_leader', 'hr'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Can only create team_leader or hr users'
      });
    }

    // If creating HR user, validate team leader
    let teamLeader = null;
    if (role === 'hr' && teamLeaderId) {
      teamLeader = await User.findById(teamLeaderId);
      if (!teamLeader || teamLeader.role !== 'team_leader') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid team leader ID'
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      teamLeader: teamLeader?._id || null,
      createdBy: req.user._id
    });

    const userResponse = await User.findById(user._id)
      .populate('teamLeader', 'name email')
      .select('-password');

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating user',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, teamLeaderId } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Don't allow updating admin users
    if (user.role === 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot update admin users'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already in use'
        });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role && ['team_leader', 'hr'].includes(role)) user.role = role;

    // Handle team leader assignment
    if (role === 'hr' && teamLeaderId) {
      const teamLeader = await User.findById(teamLeaderId);
      if (!teamLeader || teamLeader.role !== 'team_leader') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid team leader ID'
        });
      }
      user.teamLeader = teamLeaderId;
    } else if (role === 'team_leader') {
      user.teamLeader = null;
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('teamLeader', 'name email')
      .select('-password');

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Don't allow deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete admin users'
      });
    }

    // If deleting a team leader, unassign all HR users
    if (user.role === 'team_leader') {
      await User.updateMany(
        { teamLeader: user._id },
        { $set: { teamLeader: null } }
      );
    }

    // If deleting an HR user, unassign all their leads
    if (user.role === 'hr') {
      await Lead.updateMany(
        { assignedTo: user._id },
        { $set: { assignedTo: null } }
      );
    }

    await user.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Assign HR user to Team Leader
// @route   PUT /api/admin/assign-hr
// @access  Private/Admin
export const assignHRToTeamLeader = async (req, res) => {
  try {
    const { hrUserId, teamLeaderId } = req.body;

    if (!hrUserId || !teamLeaderId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both HR user ID and Team Leader ID'
      });
    }

    // Validate HR user
    const hrUser = await User.findById(hrUserId);
    if (!hrUser || hrUser.role !== 'hr') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid HR user ID'
      });
    }

    // Validate Team Leader
    const teamLeader = await User.findById(teamLeaderId);
    if (!teamLeader || teamLeader.role !== 'team_leader') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid Team Leader ID'
      });
    }

    // Assign
    hrUser.teamLeader = teamLeaderId;
    await hrUser.save();

    const updatedUser = await User.findById(hrUserId)
      .populate('teamLeader', 'name email')
      .select('-password');

    res.status(200).json({
      status: 'success',
      message: 'HR user assigned to Team Leader successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Assign HR error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error assigning HR to Team Leader',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Upload leads from CSV/Excel
// @route   POST /api/admin/upload-leads
// @access  Private/Admin
export const uploadLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a file'
      });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log('📁 File uploaded:', req.file.originalname);
    console.log('📊 Total rows in file:', data.length);
    console.log('📝 First row data:', data[0]);

    if (data.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        status: 'error',
        message: 'File is empty or invalid format'
      });
    }

    // Process leads - expecting columns: name, email, phone, company, position
    const leadsToCreate = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`\n🔍 Processing row ${i + 1}:`, row);

      // Validate required fields
      if (!row.name || !row.email || !row.phone) {
        console.log(`❌ Row ${i + 1} - Missing fields:`, {
          hasName: !!row.name,
          hasEmail: !!row.email,
          hasPhone: !!row.phone
        });
        errors.push({
          row: i + 1,
          message: 'Missing required fields (name, email, phone)'
        });
        continue;
      }

      // Check for duplicate email in database
      const existingLead = await Lead.findOne({ email: row.email });
      if (existingLead) {
        console.log(`❌ Row ${i + 1} - Duplicate email:`, row.email);
        errors.push({
          row: i + 1,
          email: row.email,
          message: 'Lead with this email already exists'
        });
        continue;
      }

      console.log(`✅ Row ${i + 1} - Valid lead, adding to create list`);
      leadsToCreate.push({
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company || null,
        position: row.position || null,
        source: row.source || 'CSV Upload',
        uploadedBy: req.user._id,
        assignedTo: null, // Will be assigned later
        status: 'pending'
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log('\n📈 Summary:');
    console.log('Total leads to create:', leadsToCreate.length);
    console.log('Total errors:', errors.length);
    console.log('Errors:', errors);

    if (leadsToCreate.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid leads to import',
        errors
      });
    }

    // Bulk insert leads (without assignment for now)
    const leads = await Lead.insertMany(leadsToCreate);

    res.status(201).json({
      status: 'success',
      message: `Successfully uploaded ${leads.length} leads`,
      data: {
        totalRows: data.length,
        successCount: leads.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Upload leads error:', error);

    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      status: 'error',
      message: 'Error uploading leads',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Distribute leads to HR users
// @route   POST /api/admin/distribute-leads
// @access  Private/Admin
export const distributeLeads = async (req, res) => {
  try {
    const { leadIds, hrUserId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of lead IDs'
      });
    }

    if (!hrUserId) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide HR user ID'
      });
    }

    // Validate HR user
    const hrUser = await User.findById(hrUserId);
    if (!hrUser || hrUser.role !== 'hr') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid HR user ID'
      });
    }

    // Update leads
    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { assignedTo: hrUserId }
    );

    res.status(200).json({
      status: 'success',
      message: `${result.modifiedCount} leads assigned to ${hrUser.name}`,
      data: {
        assignedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Distribute leads error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error distributing leads',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Get analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res) => {
  try {
    // Total leads count
    const totalLeads = await Lead.countDocuments();

    // Status-wise breakdown
    const statusBreakdown = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object
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

    // HR-wise lead distribution
    const hrDistribution = await Lead.aggregate([
      {
        $match: { assignedTo: { $ne: null } }
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
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
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
          rejected: 1,
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

    // User counts
    const userCounts = {
      admin: await User.countDocuments({ role: 'admin' }),
      teamLeader: await User.countDocuments({ role: 'team_leader' }),
      hr: await User.countDocuments({ role: 'hr' })
    };

    // Unassigned leads
    const unassignedLeads = await Lead.countDocuments({ assignedTo: null });

    res.status(200).json({
      status: 'success',
      data: {
        totalLeads,
        unassignedLeads,
        statusCounts,
        userCounts,
        hrDistribution
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching analytics',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Get all leads (with filters)
// @route   GET /api/admin/leads
// @access  Private/Admin
export const getAllLeads = async (req, res) => {
  try {
    const { status, assignedTo, search, page = 1, limit = 50 } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

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
      .populate('uploadedBy', 'name email')
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
    console.error('Get all leads error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching leads',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

export default {
  getAllUsers,
  createUser,
  assignHRToTeamLeader,
  uploadLeads,
  distributeLeads,
  getAnalytics,
  getAllLeads
};
