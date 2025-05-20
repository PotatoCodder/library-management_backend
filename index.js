const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// MySQL Connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'librarymanagement'
});

// Connect
connection.connect((err) => {
  if (err) {
    console.error('Error connecting: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL as ID ' + connection.threadId);
});

// Multer Setup (store file in memory as Buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Add Book Route
app.post('/add-book', upload.single('cover'), (req, res) => {
  const { title, author, year } = req.body;
  const cover = req.file ? req.file.buffer : null;

  const query = 'INSERT INTO books (title, author, year_published, cover) VALUES (?, ?, ?, ?)';
  connection.query(query, [title, author, year, cover], (err, result) => {
    if (err) {
      console.error('Error inserting book:', err);
      return res.status(500).json({ message: 'Error adding book' });
    }
    res.status(200).json({ message: 'Book added successfully!' });
  });
});

//delete books
app.delete('/books/:id', (req, res) => {
  const bookId = req.params.id;
  const query = 'DELETE FROM books WHERE id = ?';

  connection.query(query, [bookId], (err, result) => {
    if (err) {
      console.error('Error deleting book:', err);
      return res.status(500).json({ message: 'Error deleting book' });
    }
    res.status(200).json({ message: 'Book deleted successfully' });
  });
});

//update books
app.put('/books/:id', (req, res) => {
  const bookId = req.params.id;
  const { title, author, year } = req.body;

  const query = 'UPDATE books SET title = ?, author = ?, year_published = ? WHERE id = ?';
  connection.query(query, [title, author, year, bookId], (err, result) => {
    if (err) {
      console.error('Error updating book:', err);
      return res.status(500).json({ message: 'Error updating book' });
    }
    res.status(200).json({ message: 'Book updated successfully' });
  });
});

// 🔍 GET Books Route
app.get('/books', (req, res) => {
  const query = 'SELECT id, title, author, year_published, cover FROM books';

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching books:', err);
      return res.status(500).json({ message: 'Error retrieving books' });
    }

    // Convert cover Buffer to base64
    const books = results.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year_published,
      cover: book.cover ? `data:image/jpeg;base64,${book.cover.toString('base64')}` : null,
    }));

    res.status(200).json(books);
  });
});

// Unified Login Route for Admin and Users
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  // Check Admin table first
  const adminQuery = 'SELECT * FROM admin WHERE username = ? AND password = ?';
  connection.query(adminQuery, [username, password], (err, adminResults) => {
    if (err) {
      console.error('Error querying admin table:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (adminResults.length > 0) {
      // ✅ Admin Login
      return res.status(200).json({ message: 'Admin login successful', role: 'admin' });
    }

    // If not admin, check Users table
    const userQuery = 'SELECT * FROM users WHERE username = ? AND password = ?';
    connection.query(userQuery, [username, password], (err, userResults) => {
      if (err) {
        console.error('Error querying users table:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (userResults.length > 0) {
        // ✅ Regular User Login
        return res.status(200).json({ message: 'User login successful', role: 'user' });
      }

      // ❌ Invalid credentials for both
      return res.status(401).json({ message: 'Invalid username or password' });
    });
  });
});

// Register Route for New Users
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  // Check if user already exists
  const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
  connection.query(checkUserQuery, [username], (err, results) => {
    if (err) {
      console.error('Error checking existing user:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Insert new user
    const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
    connection.query(insertUserQuery, [username, password], (err, result) => {
      if (err) {
        console.error('Error inserting new user:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      res.status(201).json({ message: 'User registered successfully!' });
    });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
