const db = require('../db');//const db = require('../config/database.js');
require('dotenv').config();

exports.addIncome = (req, res) => {
    const { user_id, amount, frequency, date_received } = req.body;
    
    const query = `INSERT INTO income (user_id, amount, frequency, date_received) VALUES (?, ?, ?, ?)`;

    db.execute(query, [user_id, amount, frequency, date_received], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error inserting income data' });
        }
        res.status(201).json({ message: 'Income added successfully' });
    });
};