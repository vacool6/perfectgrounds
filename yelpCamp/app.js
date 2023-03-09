const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const ejsMate = require('ejs-mate');
const passport = require('passport');
const LocalStrat = require('passport-local');
const User = require('./models/user');
const Campground = require('./models/campground');
const Review = require('./models/review');


mongoose
  .connect(process.env.MONGO_URI)
  .then((res) => console.log("Connection Successful to MongoDB"))
  .catch((err) => console.log("Connection error"));

const app = express();

app.engine('ejs', ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

const sessionConfig = {
    secret: 'goodsecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));

app.use(flash())

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrat(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

const isLoggedin = ((req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error', "You must be logged in first!")
        return res.redirect('/login')
    }
    next();
})

const isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    if (!campground.author.equals(req.user._id)) { //Other way around wont work
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

const isReviewAuthor = async (req, res, next) => {
    const { id, revid } = req.params;
    const review = await Review.findById(revid);
    if (!review.author.equals(req.user._id)) { //Other way around wont work
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//User-register/login.logout
app.get('/register', (req, res) => {
    res.render('userAuth/register');
});
app.post('/register', async (req, res) => {
    try {
        try {
            const { email, username, password } = req.body;
            const user = new User({ email, username });
            const newUser = await User.register(user, password);
            req.login(newUser, err => {
                if (err) return next(err);
                req.flash('success', 'Welcome!!! ❤')
                res.redirect('/campgrounds')
            })
        } catch (err) {
            req.flash('error', err.message);
            res.redirect('/register')
        }
    } catch (e) {
        next(e);
    }
})

app.get('/login', (req, res) => {
    res.render('userAuth/login');
});
app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', "Welcome Back sir!")
    res.redirect('/campgrounds');
});

app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Logged you out successfully')
    res.redirect('/campgrounds')
})

//Routes
app.get('/', (req, res) => res.render("home"));

app.get('/campgrounds', async (req, res, next) => {
    try {
        const camp = await Campground.find({})
        res.render('allcampsites', { camp });
    } catch (e) {
        next(e);
    }
})

app.get('/campgrounds/new', isLoggedin, (req, res) => {
    res.render('new');
});
app.post('/campgrounds', isLoggedin, async (req, res, next) => {
    try {
        const newCamp = new Campground(req.body);
        newCamp.author = req.user._id;
        await newCamp.save();
        req.flash('success', 'Welcome! You are now a part of our family 😜')
        res.redirect(`/campgrounds/${newCamp._id}`);
    } catch (e) {
        next(e);
    }
})


app.get('/campgrounds/:id', async (req, res, next) => {
    try {
        const camp = await Campground.findById(req.params.id).populate('reviews').populate('author');
        // res.render('./errors/pagenotFound');
        res.render('show', { camp });
    } catch (error) {
        next(error);
    }
})

app.get('/campgrounds/:id/edit', isLoggedin, isAuthor, async (req, res, next) => {
    try {
        const camp = await Campground.findById(req.params.id);
        // console.log(req.user._id);
        // console.log('new ObjectId("' + camp.author + '")');
        res.render('edit', { camp });
    } catch (e) {
        next(e);
    }
})
app.put('/campgrounds/:id', isLoggedin, isAuthor, async (req, res) => {
    const price = parseInt(req.body.price);
    if (req.body.title === "" || req.body.location === "" || req.body.img === "" || req.body.description === "") {
        res.render('./errors/errorPage')
    }
    else if (price < 0) {
        res.render('./errors/errorPage')
    } else if (typeof price === 'number') {
        if (price > 0) {
            const { id } = req.params;
            const campground = await Campground.findByIdAndUpdate(id, { ...req.body });
            req.flash('success', 'Successfully edited your Campsite 😁')
            res.redirect(`/campgrounds/${campground._id}`)
        } else { res.send("MDC!! why are you passing string in a number input trying to crash the server??") }
    }
    //else {
    //     const { id } = req.params;
    //     const campground = await Campground.findByIdAndUpdate(id, { ...req.body });
    //     res.redirect(`/campgrounds/${campground._id}`)
    // }
})

app.delete("/campgrounds/:id", isLoggedin, isAuthor, async (req, res, next) => {
    try {
        const { id } = req.params;
        await Campground.findByIdAndDelete(id)
        req.flash('success', 'You have successfully deleted your Camp 😭')
        res.redirect('/campgrounds')
    } catch (e) {
        next(e);
    }
})
//REVIEWS:-
app.post('/campgrounds/:id/review', isLoggedin, async (req, res, next) => {
    try {
        const camp = await Campground.findById(req.params.id);
        const review = new Review(req.body);
        review.author = req.user._id;
        camp.reviews.push(review);
        await review.save();
        await camp.save();
        req.flash('success', 'We love your review! ❤')
        res.redirect(`/campgrounds/${camp._id}`);
    } catch (e) {
        next(e)
    }
})

app.delete('/campgrounds/:id/review/:revid', isLoggedin, isReviewAuthor, async (req, res, next) => {
    try {
        const { id, revid } = req.params;
        await Campground.findByIdAndUpdate(id, { $pull: { reviews: revid } });
        await Review.findByIdAndDelete(revid);
        req.flash('success', 'Successfully deleted your review 😉')
        res.redirect(`/campgrounds/${id}`);

    } catch (e) {
        next(e)
    }
})

app.all('*', (req, res) => {
    res.render('./errors/pagenotFound');
})

app.use((err, req, res, next) => {
    res.render('./errors/errorPage')
})


app.listen(8080, () => console.log("Serving at port 8080"));
