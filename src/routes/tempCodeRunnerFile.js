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