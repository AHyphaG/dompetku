const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../config/database');
const pool = require('../config/databasePromise');
const isAuthenticated = require('../middleware/auth');

router.get('/calendar', isAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
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
                expenses: {},
                otherExpenses: []
            });
        }else{
            calendarDays.push({
                date: `${year}-${month + 1}-${'0'+i}`,
                completed: false,
                expenses: {},
                otherExpenses: []
            });
        }
    }

    const queryCategories = 'SELECT * FROM categories WHERE user_id = ? AND is_daily = true';
    db.query(queryCategories, [userId], (err, categories) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (categories.length === 0) {
            return res.render('calendar', { calendarDays, categories: [] });
        }
        // console.log("Result Categories: ",categories);
        
        const queryExpenses = `
            SELECT * FROM expenses
            WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
            ORDER BY updated_at DESC
        `;
        db.query(queryExpenses, [userId, month + 1, year], (err, expenses) => {
            if (err) {
                console.error('Error fetching expenses:', err);
                return res.status(500).send('Internal Server Error');
            }
            // console.log("Result Expenses: ",expenses);
            const queryOtherExpenses = `
                SELECT * FROM other_expenses
                WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
                ORDER BY updated_at DESC
            `;

            db.query(queryOtherExpenses, [userId, month + 1, year],(err,otherExpenses)=>{
                if (err) {
                    console.error('Error fetching other expenses:', err);
                    return res.status(500).send('Internal Server Error');
                }
                calendarDays.forEach(day => {

                    const formattedDate = day.date.padStart(10, '0');
                    const dayExpenses = expenses.filter(exp => {
                        const expenseDate = new Date(exp.date).toLocaleDateString('en-CA');
                        // console.log("Perbandingan: ",expenseDate," vs ",formattedDate);
                        return expenseDate === formattedDate;
                      });
                    // console.log("day expenses: ",dayExpenses);
                    const dayOtherExpenses = otherExpenses.filter(exp => {
                        const expenseDate = new Date(exp.date).toLocaleDateString('en-CA');
                        return expenseDate === formattedDate;
                    });
                    day.completed = categories.every(category => 
                        dayExpenses.some(exp => exp.category_id === category.category_id)
                    );
                
                    categories.forEach(category => {
                        const expense = dayExpenses.find(exp => exp.category_id === category.category_id);
                        day.expenses[category.category_name] = expense ? expense.amount : null;
                    });
                    
                    dayOtherExpenses.forEach(exp => {
                        day.otherExpenses.push({ description: exp.description, amount: exp.amount });
                    });
                    // console.log(day);
                });
                res.render('calendar', { calendarDays, categories });
            });
        });
    });
});


router.post('/expenses/save', isAuthenticated, async (req, res) => {
    const { date, expenses, IDs,other_expenses } = req.body;
    const userId = req.session.user.user_id;

    console.log('Incoming request body:', req.body);

    try {
        const queries = [];

        for (const i in expenses) {
            const amount = expenses[i];
            const category_id = IDs[i];

            if (amount) {
                // Ambil expenses untuk pengecekan nanti
                const existingExpenseQuery = `
                    SELECT amount 
                    FROM expenses 
                    WHERE user_id = ? AND date = ? AND category_id = ?
                    ORDER BY updated_at DESC
                `;
                const [existingExpense] = await pool.query(existingExpenseQuery, [userId, date, category_id]);
                
                // console.log("Iterasi ke ",i, existingExpense);
                // CEK Untuk yang edit tapi sama nialinya ga usah dimasukin
                if (existingExpense.length == 0 || existingExpense[0].amount != amount) {
                    const query = `
                        INSERT INTO expenses (user_id, date, category_id, amount, created_at, updated_at)
                        VALUES (?, ?, ?, ?, NOW(), NOW())
                        ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()
                    `;
                    queries.push(pool.query(query, [userId, date, category_id, amount]));
                }
            }
        }
        if (other_expenses && Object.keys(other_expenses).length > 0) {
            for (const date in other_expenses) {
                for (const i in other_expenses[date]) {
                    const { description, amount } = other_expenses[date][i];

                    if (amount) {
                        const query = `
                            INSERT INTO other_expenses (user_id, date, description, amount, created_at, updated_at)
                            VALUES (?, ?, ?, ?, NOW(), NOW())
                        `;
                        queries.push(pool.query(query, [userId, date, description, amount]));
                    }
                }
            }
        }
        await Promise.all(queries);

        res.redirect('/calendar');
    } catch (err) {
        console.error('Error saving expenses:', err);
        res.status(500).send('Internal Server Error');
    }
});

// router.post('/expenses/save', isAuthenticated, async (req, res) => {
//     const { date, expenses, IDs } = req.body;
//     const userId = req.session.user.user_id;

//     console.log('Incoming request body:', req.body);

//     try {
//         const queries = [];

//         for (const i in expenses) {
//             const amount = expenses[i];
//             const category_id = IDs[i];
//             console.log("i:", i);

//             if (amount) {
//                 const query = `
//                     INSERT INTO expenses (user_id, date, category_id, amount, created_at, updated_at)
//                     VALUES (?, ?, ?, ?, NOW(), NOW())
//                     ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()
//                 `;
//                 queries.push(pool.query(query, [userId, date, category_id, amount]));
//             }
//         }

//         await Promise.all(queries);

//         res.redirect('/calendar');
//     } catch (err) {
//         console.error('Error saving expenses:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// router.post('/expenses/save', isAuthenticated, async (req, res) => {
//     const { date, expenses,IDs } = req.body; // Destructure date and expenses from request body
//     const userId = req.session.user.user_id;

//     // Log the incoming request body
//     console.log('Incoming request body:', req.body);

//     try {
//         // Prepare an array for database queries
//         const queries = [];
 
//         // Loop through expenses object
//         for (const i in expenses) {
//             const amount = expenses[i];
//             const category_id = IDs[i];
//             console.log("i:", i); // Log the category ID

//             // Only insert if amount is not empty
//             if (amount) {
//                 const query = `
//                     INSERT INTO expenses (user_id, date, category_id, amount)
//                     VALUES (?, ?, ?, ?)
//                     ON DUPLICATE KEY UPDATE amount = VALUES(amount)
//                 `;
//                 queries.push(pool.query(query, [userId, date, category_id, amount]));
//             }
//         }

//         // Execute all queries in parallel
//         await Promise.all(queries);

//         // Redirect to calendar after successful save
//         res.redirect('/calendar');
//     } catch (err) {
//         console.error('Error saving expenses:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });


module.exports = router;