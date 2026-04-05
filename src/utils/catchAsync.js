/**
 * Wraps async route handlers to avoid repetitive try-catch blocks.
 * Any thrown error is forwarded to Express's next() error handler.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
