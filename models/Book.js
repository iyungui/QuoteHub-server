const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Book Schema
const bookSchema = new Schema({
    title: { type: String, required: true },
    author: { type: [String], required: true },
    translator: { type: [String] },
    introduction: { type: String },
    publisher: { type: String, required: true },
    publicationDate: { type: String },
    bookImageURL: { type: String, default: '' },
    bookLink: { type: String, default: '' },
    ISBN: { type: [String] }
});

module.exports = mongoose.model('Book', bookSchema);