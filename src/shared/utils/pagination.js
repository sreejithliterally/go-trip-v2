/**
 * Parse limit/offset from query params with safe defaults.
 */
const parsePagination = (query) => {
  const limit  = Math.min(parseInt(query.limit  || '20', 10), 100);
  const offset = Math.max(parseInt(query.offset || '0',  10), 0);
  return { limit, offset };
};

module.exports = { parsePagination };
