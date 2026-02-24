const success = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'Something went wrong', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

const paginated = (res, data, total, page, limit, message = 'Success') =>
  res.status(200).json({
    success: true, message, data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });

module.exports = { success, error, paginated };
