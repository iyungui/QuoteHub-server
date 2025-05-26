// utils/responseHelper.js

/**
 * 표준화된 성공 응답을 생성합니다.
 * @param {Object} res - Express response 객체
 * @param {number} statusCode - HTTP 상태 코드
 * @param {string} message - 성공 메시지
 * @param {Object} data - 응답 데이터
 */
const sendSuccess = (res, statusCode, message, data = null) => {
    const response = {
        success: true,
        message
    };

    if (data) {
        response.data = data;
    }
    
    return res.status(statusCode).json(response);
};

/**
 * 페이지네이션이 포함된 성공 응답을 생성합니다.
 * @param {Object} res - Express response 객체
 * @param {number} statusCode - HTTP 상태 코드
 * @param {string} message - 성공 메시지
 * @param {Array} data - 응답 데이터 배열
 * @param {Object} pagination - 페이지네이션 정보
 * @param {number} pagination.currentPage - 현재 페이지
 * @param {number} pagination.totalPages - 총 페이지 수
 * @param {number} pagination.pageSize - 페이지 크기
 * @param {number} pagination.totalItems - 총 아이템 수
 */
const sendSuccessWithPagination = (res, statusCode, message, data, pagination) => {
    const response = {
        success: true,
        message,
        data,
        pagination: {
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            pageSize: pagination.pageSize,
            totalItems: pagination.totalItems
        }
    };
    
    return res.status(statusCode).json(response);
};

/**
 * 표준화된 오류 응답을 생성합니다.
 * @param {Object} res - Express response 객체
 * @param {number} statusCode - HTTP 상태 코드
 * @param {string} message - 오류 메시지
 * @param {Object} errors - 상세 오류 정보 (선택 사항)
 */
const sendError = (res, statusCode, message, errors = null) => {
    const response = {
        success: false,
        message
    };
    
    if (errors) {
        response.errors = errors;
    }
    
    return res.status(statusCode).json(response);
};

/**
 * 카운트 응답을 생성합니다.
 * @param {Object} res - Express response 객체
 * @param {number} statusCode - HTTP 상태 코드
 * @param {string} message - 성공 메시지
 * @param {number} count - 카운트 값
 */
const sendCountResponse = (res, statusCode, message, count) => {
    const response = {
        success: true,
        message,
        count
    };
    
    return res.status(statusCode).json(response);
};

module.exports = {
    sendSuccess,
    sendSuccessWithPagination,
    sendError,
    sendCountResponse
};