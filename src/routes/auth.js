const express = require('express');
const db = require('../config/database');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const router = express.Router();
const path = require('path');

//Register
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../../templates', 'register.html'));
});

router.post('/register', [
    body('username').isAlphanumeric().isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isLength({ min: 8 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, NOW())';
        db.query(query, [username, hashedPassword, email], (err, results) => {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.redirect('/');
        });
    } catch (err) {
        console.error('Error hashing password:', err);
        return res.status(500).send('Internal Server Error');
    }
});

//Login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../templates', 'login.html'));
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (results.length > 0) {
            const user = results[0];

            const match = await bcrypt.compare(password, user.password);
            if (match) {
                return res.redirect('/home');
            } else {
                return res.status(401).send('Invalid credentials');
            }
        } else {
            return res.status(404).send('User not found');
        }
    });
});

module.exports = router;