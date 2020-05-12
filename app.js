//requiring dependencies
var express        = require("express"),
	app            = express(),
	mongoose       = require("mongoose"),
	bodyParser     = require("body-parser"),
	passport       = require("passport"),
	localStrategy  = require("passport-local"),
	methodOverride = require("method-override"),
	flash 		   = require("connect-flash"),
	session        = require('express-session'),
	MongoStore     = require('connect-mongo')(session);

//requiring models
var User    = require("./models/userMod"),
	Comment = require("./models/commentMod");

//requiring routes
var userRoute    = require("./routes/userRoute"),
	commentRoute = require("./routes/commentRoute"),
	indexRoute   = require("./routes/index");


//app.sets
app.set("view engine","ejs");                   //used so I don't have to end every res.render string with ".ejs"

//app.uses for requires
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));//used for accessing css
app.use(methodOverride("_method"));             //used for edit and update routes

//mongoose stuff
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

var db_url = process.env.DBURL || "mongodb://localhost/thankfull_db"

mongoose.connect(db_url);
app.use(flash());

//express-session stuff
//mongodb+srv://willklep:<password>@thankfull-bna6g.mongodb.net/test?retryWrites=true&w=majority
app.use(require("express-session")({
	secret: "ur3gi3r3irh3urgbvfhjfgsdjfskgfeyuf3grukj3rugh3fgekfjegrfakliawdhaliueaf",
	resave: false,
	saveUninitialized: false,
	store: new MongoStore({mongooseConnection: mongoose.connection}),
	cookie: {maxAge: 24 * 60 * 60 * 1000}
}));

//passport config
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//function for determining currentUser
app.use(function(req,res,next){
	res.locals.currentUser = req.user;
	res.locals.session = req.session;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});
//app.use routes
app.use(userRoute);
//app.use(commentRoute);
app.use(indexRoute);


var port = process.env.PORT || 3000;

app.listen(port, function () {

console.log("Server Has Started!");

});
