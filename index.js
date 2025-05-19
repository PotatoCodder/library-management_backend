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

// Admin Login Route
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  const query = 'SELECT * FROM admin WHERE username = ? AND password = ?';
  connection.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error querying admin table:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length > 0) {
      // Admin found, login successful
      res.status(200).json({ message: 'Login successful', admin: results[0] });
    } else {
      // Invalid credentials
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
