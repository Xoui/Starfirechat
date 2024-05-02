const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Read users from JSON file
const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json')));

// Configure Passport.js
passport.use(new LocalStrategy(
    (username, password, done) => {
        const user = usersData.users.find(u => u.username === username && u.password === password);
        if (user) {
            return done(null, user);
        } else {
            return done(null, false, { message: 'Incorrect username or password' });
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.username);
});

passport.deserializeUser((username, done) => {
    const user = usersData.users.find(u => u.username === username);
    done(null, user);
});

// Login route with Passport authentication
app.post('/login', passport.authenticate('local', {
    successRedirect: '/chat',
    failureRedirect: '/login',
    failureFlash: true
}));

// Chat route
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Redirect root URL to login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Serve login.html when accessing /login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
