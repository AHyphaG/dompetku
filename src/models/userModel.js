const db = require('../config/database');

const getUserById = (id, callback) => {
    db.query('SELECT * FROM users WHERE id = ?', [id], (error, results) => {
        if (error) {
            return callback(error);
        }
        callback(null, results[0]); // Mengembalikan pengguna pertama (jika ada)
    });
};

module.exports = { getUserById };