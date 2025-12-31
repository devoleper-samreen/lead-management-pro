import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  assignHRToTeamLeader,
  uploadLeads,
  distributeLeads,
  getAnalytics,
  getAllLeads
} from '../controllers/admin.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// User management
router.route('/users')
  .get(getAllUsers)
  .post(createUser);

router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

router.put('/assign-hr', assignHRToTeamLeader);

// Lead management
router.post('/upload-leads', upload.single('file'), uploadLeads);
router.post('/distribute-leads', distributeLeads);
router.get('/leads', getAllLeads);

// Analytics
router.get('/analytics', getAnalytics);

export default router;
