const express =  require("express");
const morgan = require('morgan')
const bodyparser = require("body-parser");
const session = require("express-session");
const {v4:uuidv4} = require("uuid");
const path = require("path");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const passport = require("./model/passport");
require("dotenv").config();

const app = express();

//body-parser
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: false}));
app.use(morgan('dev'))

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

//404
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/admin')) {
        res.status(404).render('admin404');
    } else {
        res.status(404).render('user404');
    }
});

//database-connection
mongoose.connect(process.env.MONGO_DB)
.then(() => console.log("successfully connected to database"))
.catch((err) => console.log("Error connecting to database"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`server started listening on http://localhost:${PORT}`));
