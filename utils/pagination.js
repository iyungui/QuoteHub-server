// utils/pagination.js

/**
 * Pages through the results of a Mongoose query.
 * @param {Query} query - Mongoose query to paginate.
 * @param {number} page - Current page number.
 * @param {number} pageSize - Number of items per page.
 * @returns {Promise<Array>} - Paginated documents.
 */
const paginateQuery = async (query, page, pageSize) => {
    const skip = (page - 1) * pageSize;
    return query.skip(skip).limit(pageSize);
  };
  
  /**
   * Calculates the total number of pages.
   * @param {number} totalItems - Total number of items.
   * @param {number} pageSize - Number of items per page.
   * @returns {number} - Total pages.
   */
  const calculateTotalPages = (totalItems, pageSize) => {
    return Math.ceil(totalItems / pageSize);
  };
  
  module.exports = {
    paginateQuery,
    calculateTotalPages
  };
  