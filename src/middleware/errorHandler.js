const AppError = require('../utils/AppError');

// Handle CastError (invalid MongoDB ObjectId)
const handleCastErrorDB = (err) => {
  return new AppError(`Invalid ${err.path}: ${err.value}.`, 400, [
    { field: err.path, message: `Invalid ${err.path}: ${err.value}.` },
  ]);
};

// Handle duplicate key errors (e.g. duplicate email)
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(
    `Duplicate field value: "${value}" for field "${field}". Please use a different value.`,
    409,
    [{ field, message: `Duplicate value: "${value}" already exists.` }]
  );
};

// Handle Mongoose validation errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  return new AppError(`Invalid input data: ${errors.map((e) => e.message).join('. ')}`, 400, errors);
};

// Handle invalid/malformed JWT
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

// Handle expired JWT
const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

// Development error — full stack trace
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    ...(err.errors && { errors: err.errors }),
  });
};

// Production error — sanitized, no stack
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  } else {
    // Programming/unknown error: don't leak details
    console.error('💥 UNEXPECTED ERROR:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

// Global Express error handler (4 arguments = error handler)
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, message: err.message, name: err.name };

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;
