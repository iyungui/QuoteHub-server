// controllers/bookController.js
const mongoose = require('mongoose');
const axios = require('axios');
const Book = require('../models/Book');

async function fetchBooksByPage(query, REST_API_KEY, page = 1) {
    try {
        const response = await axios.get(`https://dapi.kakao.com/v3/search/book`, {
            params: {
                query: query,
                page: page
            },
            headers: {
                "Authorization": `KakaoAK ${REST_API_KEY}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching book data:', error);
        throw error;
    }
}

exports.fetchBookData = async (req, res, next) => {
    const searchQuery = req.query.query;
    const page = parseInt(req.query.page) || 1;
    const REST_API_KEY = process.env.REST_API_KEY;

    try {
        const kakaoResponse = await fetchBooksByPage(searchQuery, REST_API_KEY, page);

        // ISBN 배열에서 빈 문자열을 제거합니다.
        kakaoResponse.documents = kakaoResponse.documents.map(doc => ({
            title: doc.title,
            author: doc.authors,
            translator: doc.translators,
            introduction: doc.contents,
            publisher: doc.publisher,
            publicationDate: doc.datetime,
            bookImageURL: doc.thumbnail,
            bookLink: doc.url,
            ISBN: doc.isbn.split(' ').filter(isbn => isbn)  // 빈 ISBN 제거
        }));

        // 빈 ISBN을 제거한 후 기존 책 검색
        const existingBooks = await Book.find({
            'ISBN.0': {
                $in: kakaoResponse.documents
                    .filter(doc => doc.ISBN.length > 0)
                    .map(b => b.ISBN[0])
            }
        });
        
        // 기존에 DB에 있는 책들의 _id 값을 kakaoResponse.documents에 반영
        existingBooks.forEach(existingBook => {
            const matchedBook = kakaoResponse.documents.find(b => b.ISBN.includes(existingBook.ISBN[0]));
            if (matchedBook) {
                matchedBook._id = existingBook._id.toString(); // ObjectId를 문자열로 변환
            }
        });
    
        const existingISBNs = existingBooks.map(b => b.ISBN[0]);
        // 빈 ISBN을 제거하고 새 책들을 필터링
        const newBooks = kakaoResponse.documents.filter(
            b => b.ISBN.length > 0 && !existingISBNs.includes(b.ISBN[0])
        );
    
        if (newBooks.length) {
            const insertedBooks = await Book.insertMany(newBooks);
            
            // 새로 추가된 책들의 _id 값을 kakaoResponse.documents에 반영
            insertedBooks.forEach(insertedBook => {
                const matchedBook = kakaoResponse.documents.find(b => b.ISBN.includes(insertedBook.ISBN[0]));
                if (matchedBook) {
                    matchedBook._id = insertedBook._id.toString(); // ObjectId를 문자열로 변환
                }
            });
        }
    
        res.json(kakaoResponse);
    } catch (error) {
        console.error('Error fetching book data:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};


exports.recommendTodayBooks = async (req, res, next) => {
    try {
        // DB에서 무작위로 책 10 가지 선택
        const recommendedBook = await Book.aggregate([{ $sample: { size: 10 } }]);
        res.status(200).json({ success: true, data: recommendedBook });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};
