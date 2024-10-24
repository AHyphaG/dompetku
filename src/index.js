const express = require('express');
const session = require('express-session');
const db = require('./config/database');
const path = require('path');

//Daftar Routes
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');
const calendarRoutes = require('./routes/calendar');

const app = express();
const PORT = process.env.PORT;

app.use(session({
    secret: 'secret12',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set ke true jika menggunakan HTTPS
}));

app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', authRoutes);
app.use('/', homeRoutes);
app.use('/', calendarRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
