import express from 'express';
import {
  getAssignedHRUsers,
  getTeamAnalytics,
  getTeamLeads
} from '../controllers/teamLeader.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes are protected and require team_leader role
router.use(protect);
router.use(authorize('team_leader'));

// Get assigned HR users with stats
router.get('/hr-users', getAssignedHRUsers);

// Get team analytics
router.get('/analytics', getTeamAnalytics);

// Get team leads (with filters)
router.get('/leads', getTeamLeads);

export default router;
