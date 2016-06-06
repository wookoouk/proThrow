const config = require('./config.json');
const express = require('express');
const path = require('path');
const session = require('express-session');
const rethinkSession = require('session-rethinkdb')(session);
const passport = require('passport');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const util = require('./lib/util.js');
const r = require('./lib/thinky').r;
const store = new rethinkSession(r);
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.use(
    session(
        {
            secret: config.secret,
            resave: false,
            saveUninitialized: false,
            store: store
        }
    )
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    if (req.user != null) {
        res.locals.signedInUser = {};
        res.locals.signedInUser.username = req.user.username;
        res.locals.signedInUser.name = req.user.name;
        res.locals.signedInUser.mail = req.user.mail;
        res.locals.signedInUser.isAdmin = util.isAdmin(req.user.username);
        return next(null, req, res);
    } else {
        return next();
    }
});


util.setupPassport();

app.use('/', require('./routes'));

module.exports = app;
