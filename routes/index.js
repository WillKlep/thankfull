var express 					   = require("express"),
	router 						   = express.Router(),
 	User 						   = require("../models/userMod"),
 	passport 					   = require("passport"),
 	{check, validationResult,body} = require("express-validator"),
 	async 						   = require("async");
const mailgun 					   = require("mailgun-js"),
 	  DOMAIN 					   = "sandbox271ead1122e84408b98edb87e5686a9f.mailgun.org",
	  mg                           = mailgun({apiKey: "4c53ce10bce62e35fa5ff5f08fa3c6ff-65b08458-d3055c1f", domain: DOMAIN}),
 	  crypto                       = require("crypto"),
	  localStrategy                = require("passport-local");
 


router.use(passport.initialize());
router.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

router.get("/",function(req,res){
	if(req.user){
		goodTextArr = [];
		for(var i = 0; i < req.user.good.length;i++){
			goodTextArr.push(req.user.good[i].text);
		}
		myselfTextArr = [];
		for(var i = 0; i < req.user.myself.length;i++){
			myselfTextArr.push(req.user.myself[i].text);
		}
		res.render("landing",{goodTextArr:goodTextArr,myselfTextArr:myselfTextArr});
	}
	else{
		res.render("landing");
	}
	
});

//AUTH Routes
//NEW ROUTE - show register form
router.get("/signup", function(req,res){
	res.render("signup");
});

//CREATE ROUTE - signUp Logic
router.post("/signup",function(req,res){
	
	User.findOne({username:req.body.username.toLowerCase()},function(err,existingUser){
		if(!err){
			User.findOne({email:req.body.email},function(err,existingEmail){
				if(!err){
					if(req.body.password === req.body.confirm_password){
							newUser = new User({
							username: req.body.username.toLowerCase(),
							email:    req.body.email,
							fName:    req.body.fName,
							lName:    req.body.lName,
						});

						User.register(newUser,req.body.password, function(err,user){
							if(err){
								console.log(err);
								req.flash("error","We couldn't sign you up. Please try again.");
								return res.redirect("/signup");
							}else{
								passport.authenticate("local")(req,res,function(){
									req.flash("success","Welcome to thankfull, " + req.body.username + "!");
									return res.redirect("/");
								});
							}
						});
					}
					else{
						req.flash("error","Your passwords don't match, please try again!");
						res.redirect("/signup");
					}
				}
				else{
					req.flash("error","Someone else has that email. Please enter a different one.");
					res.redirect("/signup");
				}
			});
		}
		else{
			req.flash("error","Someone else has that username. Please enter a different one.");
			res.redirect("/signup");
		}
	});
});

//NEW ROUTE - show signin form
router.get("/signin", function(req,res){
	res.render("signin");
});
//Login in from data from form
router.post("/signin", userToLowerCaseBody, passport.authenticate("local",{
	successRedirect: "/",
	successFlash: "Welcome Back!",
	failureRedirect: "/signin",
	failureFlash: "We couldn't sign you in, please try again."
}), function(req,res){	
});
//logout
router.get("/logout",function(req,res){
	req.logout();
	req.flash("success","See you soon!");
	res.redirect("/");
});

//PASSWORD RESET ROUTES
//render form for forgot pass, user enters email
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

//retrieve email from user through post-request
router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      const forgotMessage = {
	from: "thankfull team <thankfullteam@gmail.com>",
	to: user.email,
	subject: 'thankfull Password Reset Request',
	text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
		'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
		'http://' + req.headers.host + '/reset/' + token + '\n\n' +
		'If you did not request this, please ignore this email and your password will remain unchanged.\n'
};
    mg.messages().send(forgotMessage, function (error, body) {
		console.log(body);
		req.flash("success","Thanks! An email has been sent to " + user.email + "with further instructions. Please check your spam folder.");
		res.redirect("/forgot");
	});
	}
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});


//RESET PASSWORD
router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
      
     function(user, done) {
      const resetMessage = {
	from: "thankfull team <thankfullteam@gmail.com>",
	to: user.email,
	subject: 'thankfull Password Reset',
	text: 'Hello,\n\n' +
          "This is a confirmation that the password for your account " + user.email + " has just been changed.\n If you didn't change your password, please go to [forgot password link] to reset it. \n Best, \n The thankfull team"
};
      mg.messages().send(resetMessage, function (error, body) {
		console.log(body);
		req.flash("success","Success! Your password has been changed!");
		res.redirect("/");
	});
    }
  ], function(err) {
    res.redirect('/');
  });
});

//CONTACT PAGE
router.get("/contact",function(req,res){
	res.render("contact");
});

router.post("/contact",function(req,res){
	const contactMessage = {
		from: req.body.email,
		to: "thankfullteam@gmail.com",
		subject: req.body.title,
		text: req.body.text
	};
	mg.messages().send(contactMessage,function(error, body){
		if(error){
			req.flash("error","Your message could not be sent, please try again!");
		}
		else{
			console.log(body);
			req.flash("success","Success! Your message has been sent!");
			res.redirect("back");
		}
	})
});

//ABOUT PAGE
router.get("/about",function(req,res){
	res.render("about");
});

router.get("*",function(req,res){
	res.render("404");
});

//MIDDLEWARE
function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	else{
		res.redirect("/signin");
	}
};



function userToLowerCaseBody(req,res,next){
	req.body.username = req.body.username.toLowerCase();
	next();
}

module.exports = router;