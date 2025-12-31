import express from 'express';
import {
  getMyLeads,
  updateLeadStatus,
  getMyStats,
  getLeadById
} from '../controllers/hr.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes are protected and require hr role
router.use(protect);
router.use(authorize('hr'));

// Get my stats
router.get('/stats', getMyStats);

// Lead routes
router.get('/leads', getMyLeads);
router.get('/leads/:id', getLeadById);
router.put('/leads/:id', updateLeadStatus);

export default router;
