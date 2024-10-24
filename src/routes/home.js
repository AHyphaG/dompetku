const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../config/database');
const pool = require('../config/databasePromise');

const isAuthenticated = require('../middleware/auth');

router.get('/home', isAuthenticated, (req, res) => {
    res.render('home', { username: req.session.user.username,id: req.session.user.user_id });
});

router.get('/incomes',isAuthenticated,(req,res)=>{
    const query = 'SELECT * FROM income WHERE user_id = ?';
    db.query(query, [req.session.user.user_id],(err,results)=>{
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length === 0) {
            res.render('incomes', { 
                message: 'Anda belum menambahkan income', 
                id: req.session.user.user_id,
                incomes: []
            });
        } else {
            res.render('incomes', { 
                message: 'Tambah income baru', 
                id: req.session.user.user_id,
                incomes: results 
            });
        }
    });
});
router.post('/incomes/add', isAuthenticated, (req, res) => {
    const { amount, frequency } = req.body;
    const userId = req.session.user.user_id;
    const date = new Date();

    const query = 'INSERT INTO income (user_id, amount, frequency, date_received ,updated_at) VALUES (?, ?, ?, ?,?)';
    
    db.query(query, [userId, amount, frequency, date,date], (err, result) => {
        if (err) {
            console.error('Error adding income:', err);
            return res.status(500).send('Internal Server Error');
        }
        
        console.log('Income added successfully:', result);
        res.redirect('/incomes');
    });
});

router.get('/categories', isAuthenticated, (req, res) => {
    const query = 'SELECT * FROM categories WHERE user_id = ?';
    db.query(query, [req.session.user.user_id],(err,results)=>{
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length === 0) {
            res.redirect('/categories-setup');
        } else {
            res.render('categories', { 
                message: 'Tambah income baru', 
                id: req.session.user.user_id,
                categories: results 
            });
        }
    });
});
router.post('/categories/add', isAuthenticated, (req, res) => {
    const { catName, is_daily, daily_budget, active_days, budget_amount } = req.body;
    const userId = req.session.user.user_id;
    
    const isDaily = is_daily ? 1 : 0;

    if (isDaily) {
        const kuery = 'SELECT frequency FROM income WHERE user_id = ? LIMIT 1';
        db.query(kuery, [userId], (err, result) => {
            if (err) {
                console.error('Error mengambil data income:', err);
                return res.status(500).send('Internal Server Error');
            }
            if (result.length === 0) {
                console.log("Income data tidak ditemukan");
                return res.status(404).send('Income data tidak ditemukan');
            }

            const freq = result[0].frequency;

            const activeDaysCount = active_days ? active_days.length : 0;
            const weeksInMonth = Math.floor((30/freq) / 7);
            const activeDaysInMonth = activeDaysCount * weeksInMonth;
            const catFinalBudget = daily_budget * activeDaysInMonth;

            const tanggal = new Date();
            
            const activeDaysString = active_days ? active_days.join(',') : null;

            const query = `
                INSERT INTO categories (user_id, category_name, budget_amount, created_at, is_daily, daily_budget, active_days)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(query, [userId, catName, catFinalBudget, tanggal, isDaily, daily_budget, activeDaysString], (err, result) => {
                if (err) {
                    console.error('Error inserting categories:', err);
                    return res.status(500).send('Internal Server Error');
                }

                res.redirect('/categories');
            });
        });
    } else {
        const tanggal = new Date();

        const query = `
            INSERT INTO categories (user_id, category_name, budget_amount, created_at, is_daily)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(query, [userId, catName, budget_amount, tanggal, isDaily], (err, result) => {
            if (err) {
                console.error('Error inserting categories:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.redirect('/categories');
        });
    }
});

router.get('/categories-setup', isAuthenticated, (req, res) => {
    res.render('categories-setup', { id: req.session.user.user_id });
});

router.post('/categories-setup/create', isAuthenticated, (req, res) => {
    const { sarapan, sarapan_budget, makansiang, makansiang_budget, makanmalam, makanmalam_budget } = req.body;
    const userId = req.session.user.user_id;

    const sarapanDailyBudget = sarapan ? sarapan_budget : 0;
    const makansiangDailyBudget = makansiang ? makansiang_budget : 0;
    const makanmalamDailyBudget = makanmalam ? makanmalam_budget : 0;

    const kuery = 'SELECT frequency FROM income WHERE user_id = ? LIMIT 1';
    db.query(kuery, [userId], (err, result) => {
        if (err) {
            console.error('Error mengambil data income:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (result.length === 0) {
            console.log("Income data tidak ditemukan");
            return res.status(404).send('Income data tidak ditemukan');
        }

        const freq = result[0].frequency;

        const sarapanFinalBudget = sarapanDailyBudget * (30 / freq);
        const makansiangFinalBudget = makansiangDailyBudget * (30 / freq);
        const makanmalamFinalBudget = makanmalamDailyBudget * (30 / freq);
        const tanggal = new Date;
        const query = `
            INSERT INTO categories (user_id, category_name, budget_amount, created_at,is_daily, daily_budget)
            VALUES
            (?, 'sarapan', ?, ?,true, ?),
            (?, 'makansiang', ?, ?,true, ?),
            (?, 'makanmalam', ?, ?,true, ?)
        `;

        db.query(query, [
            userId, sarapanFinalBudget, tanggal,sarapanDailyBudget,
            userId, makansiangFinalBudget, tanggal,makansiangDailyBudget,
            userId, makanmalamFinalBudget, tanggal,makanmalamDailyBudget
        ], (err, result) => {
            if (err) {
                console.error('Error inserting categories:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.redirect('/categories');
        });
    });
});






module.exports = router;