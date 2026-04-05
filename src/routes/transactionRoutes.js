const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  createValidation,
  updateValidation,
} = require('../controllers/transactionController');

// All routes require authentication
router.use(auth);

// POST /api/transactions  — admin only
router.post('/', allowRoles('admin'), createValidation, validate, createTransaction);

// GET /api/transactions  — analyst & admin
router.get('/', allowRoles('admin', 'analyst'), getTransactions);

// GET /api/transactions/:id  — analyst & admin
router.get('/:id', allowRoles('admin', 'analyst'), getTransaction);

// PATCH /api/transactions/:id  — admin only
router.patch('/:id', allowRoles('admin'), updateValidation, validate, updateTransaction);

// DELETE /api/transactions/:id  — admin only (soft delete)
router.delete('/:id', allowRoles('admin'), deleteTransaction);

module.exports = router;
