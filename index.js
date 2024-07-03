const express =  require("express");
const bodyparser = require("body-parser");
const session = require("express-session");
const {v4:uuidv4} = require("uuid");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv")
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const passport = require("./model/passport");

const app = express();
dotenv.config();

//body-parser
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: false}));

//view-engine
app.set('view engine', 'ejs');

//static-path
app.use('/static', express.static(path.join(__dirname, 'assets')));
app.use('/assets2', express.static(path.join(__dirname, 'assets2')));

//session-configuration
app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

//user-routes
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

// Google auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/googleAuth',
    passport.authenticate('google', { failureRedirect: '/login' }),
    async (req, res) => {
        req.session.user = req.session.passport.user;
        res.redirect("/userHome");
    }
);

//database-connection
mongoose.connect("mongodb://localhost:27017/WingCart")
.then(() => console.log("successfully connected to database"))
.catch((err) => console.log("Error connecting to database"));

const PORT = process.env.PORT;
app.listen(3001, () => console.log("server started listening on http://localhost:3001"));