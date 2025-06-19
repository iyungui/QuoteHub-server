// utils/filterHelper.js

/**
 * 인증된 사용자의 차단 목록을 기반으로 쿼리에 필터링 조건을 추가합니다.
 * @param {Object} query - MongoDB 쿼리 객체
 * @param {Object} user - 인증된 사용자 객체 (req.user)
 * @param {String} userField - 사용자 ID가 저장된 필드명 (예: 'userId', 'author')
 * @returns {Object} 필터링이 적용된 쿼리 객체
 */
const applyBlockedUsersFilter = (query, user, userField = 'userId') => {
    // 인증된 사용자가 없으면 필터링하지 않음
    if (!user || !user.blockedUsers || user.blockedUsers.length === 0) {
        return query;
    }

    // 차단된 사용자들의 콘텐츠 제외
    return {
        ...query,
        [userField]: { $nin: user.blockedUsers }
    };
};

/**
 * 북스토리 쿼리에 차단 필터 적용
 * @param {Object} query - 기존 쿼리
 * @param {Object} user - 인증된 사용자
 * @returns {Object} 필터링된 쿼리
 */
const applyBookStoryFilter = (query, user) => {
    return applyBlockedUsersFilter(query, user, 'userId');
};

/**
 * 폴더 쿼리에 차단 필터 적용
 * @param {Object} query - 기존 쿼리
 * @param {Object} user - 인증된 사용자
 * @returns {Object} 필터링된 쿼리
 */
const applyFolderFilter = (query, user) => {
    return applyBlockedUsersFilter(query, user, 'userId');
};

/**
 * 사용자 검색 쿼리에 차단 필터 적용
 * @param {Object} query - 기존 쿼리
 * @param {Object} user - 인증된 사용자
 * @returns {Object} 필터링된 쿼리
 */
const applyUserSearchFilter = (query, user) => {
    return applyBlockedUsersFilter(query, user, '_id');
};

module.exports = {
    applyBlockedUsersFilter,
    applyBookStoryFilter,
    applyFolderFilter,
    applyUserSearchFilter
};