const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  getMe,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  updateRoleValidation,
  updateStatusValidation,
} = require('../controllers/userController');

// All routes below require authentication
router.use(auth);

// GET /api/users/me  — own profile (all roles)
router.get('/me', getMe);

// GET /api/users  — admin only, paginated list
router.get('/', allowRoles('admin'), getAllUsers);

// GET /api/users/:id  — admin only
router.get('/:id', allowRoles('admin'), getUserById);

// PATCH /api/users/:id/role  — admin only
router.patch('/:id/role', allowRoles('admin'), updateRoleValidation, validate, updateUserRole);

// PATCH /api/users/:id/status  — admin only
router.patch('/:id/status', allowRoles('admin'), updateStatusValidation, validate, updateUserStatus);

module.exports = router;
