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
            const weeksInMonth = 30 / 7;
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


router.get('/calendar', isAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;

    // Membuat daftar tanggal dalam bulan saat ini
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // Menghitung jumlah hari dalam bulan

    let calendarDays = [];

    // Membuat array dari tanggal 1 sampai akhir bulan
    for (let i = 1; i <= daysInMonth; i++) {
        // calendarDays.push({
        //     date: `${year}-${month + 1}-${i}`,
        //     completed: false,
        //     expenses: {}
        // });
        if (i>9) {
            calendarDays.push({
                date: `${year}-${month + 1}-${i}`,
                completed: false,
                expenses: {}
            });
        }else{
            calendarDays.push({
                date: `${year}-${month + 1}-${'0'+i}`,
                completed: false,
                expenses: {}
            });
        }
    }

    // Query untuk mendapatkan kategori pengeluaran harian
    const queryCategories = 'SELECT * FROM categories WHERE user_id = ? AND is_daily = true';
    db.query(queryCategories, [userId], (err, categories) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (categories.length === 0) {
            return res.render('calendar', { calendarDays, categories: [] }); // Jika tidak ada kategori
        }
        console.log("Result Categories: ",categories);
        // Query untuk mendapatkan expenses dari database
        const queryExpenses = 'SELECT * FROM expenses WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?';
        db.query(queryExpenses, [userId, month + 1, year], (err, expenses) => {
            if (err) {
                console.error('Error fetching expenses:', err);
                return res.status(500).send('Internal Server Error');
            }
            console.log("Result Expenses: ",expenses);
            // calendarDays.forEach(day => {

            //     const formattedDate = day.date.padStart(10, '0');
            //     const dayExpenses = expenses.filter(exp => {
            //         const expenseDate = new Date(exp.date).toLocaleDateString('en-CA');
            //         console.log("Perbandingan: ",expenseDate," vs ",formattedDate);
            //         return expenseDate === formattedDate;
            //       });
            //     // console.log("day expenses: ",dayExpenses);
            //     day.completed = categories.every(category => 
            //         dayExpenses.some(exp => exp.category_id === category.category_id) // Just check if expense exists for the category
            //     );
            
            //     // Simpan detail expenses untuk ditampilkan
            //     categories.forEach(category => {
            //         const expense = dayExpenses.find(exp => exp.category_id === category.category_id);
            //         day.expenses[category.category_name] = expense ? expense.amount : null;
            //     });
            //     // console.log(day);
            // });
            // Untuk setiap hari dalam bulan
            calendarDays.forEach(day => {
                const dayOfWeek = new Date(day.date).toLocaleString('en-US', { weekday: 'short' });
                const formattedDate = day.date.padStart(10, '0');
            
                const dayExpenses = expenses.filter(exp => {
                    const expenseDate = new Date(exp.date).toLocaleDateString('en-CA');
                    console.log("Perbandingan: ", expenseDate, " vs ", formattedDate);
                    return expenseDate === formattedDate;
                });
            
                day.completed = categories.every(category => {
                    if (category.is_daily) {
                        // Pengecekan untuk active_days
                        const activeDays = category.active_days ? category.active_days.split(',') : []; // Pengecekan null
                        const isActiveToday = activeDays.includes(dayOfWeek); // Cek apakah hari ini termasuk dalam active_days
                        
                        if (isActiveToday) {
                            const hasExpense = dayExpenses.some(exp => exp.category_id === category.category_id);
                            return hasExpense; // Jika ada pengeluaran, maka true; jika tidak ada, false
                        }
                        return false; // Jika hari ini tidak aktif, anggap tidak selesai
                    } else {
                        return dayExpenses.some(exp => exp.category_id === category.category_id);
                    }
                });
            
                categories.forEach(category => {
                    const expense = dayExpenses.find(exp => exp.category_id === category.category_id);
            
                    if (category.is_daily) {
                        const activeDays = category.active_days ? category.active_days.split(',') : []; // Pengecekan null
                        const isActiveToday = activeDays.includes(dayOfWeek); // Cek apakah hari ini termasuk dalam active_days
            
                        if (isActiveToday) {
                            day.expenses[category.category_name] = expense ? expense.amount : category.daily_budget;
                        }
                    } else {
                        day.expenses[category.category_name] = expense ? expense.amount : null;
                    }
                });
            
                console.log(day);
            });
            
            


            res.render('calendar', { calendarDays, categories }); // Kirim data categories ke template
        });
    });
});


router.post('/expenses/save', isAuthenticated, async (req, res) => {
    const { date, expenses,IDs } = req.body; // Destructure date and expenses from request body
    const userId = req.session.user.user_id;

    // Log the incoming request body
    console.log('Incoming request body:', req.body);

    try {
        // Prepare an array for database queries
        const queries = [];
 
        // Loop through expenses object
        for (const i in expenses) {
            const amount = expenses[i];
            const category_id = IDs[i];
            console.log("i:", i); // Log the category ID

            // Only insert if amount is not empty
            if (amount) {
                const query = `
                    INSERT INTO expenses (user_id, date, category_id, amount)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE amount = VALUES(amount)
                `;
                queries.push(pool.query(query, [userId, date, category_id, amount]));
            }
        }

        // Execute all queries in parallel
        await Promise.all(queries);

        // Redirect to calendar after successful save
        res.redirect('/calendar');
    } catch (err) {
        console.error('Error saving expenses:', err);
        res.status(500).send('Internal Server Error');
    }
});






module.exports = router;