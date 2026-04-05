const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
} = require('../controllers/dashboardController');

// All dashboard routes require authentication
router.use(auth);

// GET /api/dashboard/summary  — all roles
router.get('/summary', allowRoles('admin', 'analyst', 'viewer'), getSummary);

// GET /api/dashboard/categories  — all roles
router.get('/categories', allowRoles('admin', 'analyst', 'viewer'), getCategoryBreakdown);

// GET /api/dashboard/trends  — all roles  (?months=12)
router.get('/trends', allowRoles('admin', 'analyst', 'viewer'), getMonthlyTrends);

// GET /api/dashboard/trends/weekly  — all roles  (?weeks=12)
router.get('/trends/weekly', allowRoles('admin', 'analyst', 'viewer'), getWeeklyTrends);

// GET /api/dashboard/recent  — all authenticated  (?limit=10)
router.get('/recent', getRecentActivity);

module.exports = router;
