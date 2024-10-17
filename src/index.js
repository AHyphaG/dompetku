const express = require('express');
const db = require('./config/database');
const path = require('path');
const authRoutes = require('./routes/auth');


const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', authRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
