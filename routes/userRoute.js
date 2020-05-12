var express 	     = require("express"),
    router 		     = express.Router({mergeParams:true}),
    User 			 = require("../models/userMod"),
    passport 		 = require("passport"),
    uniqueValidator  = require('mongoose-unique-validator'),
    multer 		 	 = require('multer'),
    storage 		 = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'thankfull', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


router.get("/mylists", checkUserOwnership, function(req,res){ 
	User.findOne({username:req.user.username},function(err,foundUser){
		if(err){
			console.log(err);
		}
		else{
			//eval(require("locus"));
			res.render("userEJSs/mylists",{user:foundUser});
		}
	});
});

//CREATE ROUTE
router.post("/mylists", checkUserOwnership, function(req,res){ 
	goodObj = {text:req.body.good};
	myselfObj = {text:req.body.myself};
	//eval(require("locus"));
	User.findOne({username:req.user.username},function(err,foundUser){
		if(err){
			console.log(err);
		}
		else{
			if(req.body.good.trim().length != 0){
				foundUser.good.push(goodObj);
				foundUser.save();
				req.flash("success","Item was added!");
			}
			else{
				req.flash("error","Could not add a blank item to your Good List. Please try again!");
			}
			if(req.body.myself.trim().length != 0){
				foundUser.myself.push(myselfObj);
				foundUser.save();
				req.flash("success","Item was added!");
			}
			else{
				req.flash("error"," Could not add a blank item to your Myself List. Please try again!");
			}
		res.redirect("/mylists");
		}
	});
});

//UPDATE ROUTE FOR UPDATING LISTS
router.put("/mylists", checkUserOwnership, function(req,res){ 
	User.findOne({username:req.user.username}, function(err,foundUser){
		if(err){
			req.flash("error", "items were not updated");
			res.redirect("back");
			console.log(err);
		}
		else{
			for(var i = 0; i < foundUser.good.length; i++){
				foundUser.good[i].text = req.body.goodtext[i];
			};
			
			for(var i = 0; i < foundUser.myself.length; i++){
				foundUser.myself[i].text = req.body.myselftext[i];
			};
			foundUser.save();
			
			req.flash("success","Item(s) were updated!");
			res.redirect("back");
		}
	});
});

//DELETE ITEMS OFF LISTS
router.delete("/mylists", checkUserOwnership, function(req,res){
	User.updateMany({username:req.user.username}, {$pull:{good: {_id: req.body.goodcheckbox}}},function(err,foundCheck){
		if(err){
			req.flash("error", "items were not deleted");
			//res.redirect("back");
			console.log(err);
		}
		else{
			req.flash("success","items were deleted");
			//res.redirect("back");
		}
	});
	User.updateMany({username:req.user.username}, {$pull: {myself: {_id: req.body.myselfcheckbox}}},function(err,foundmyselfCheck){
		if(err){
			req.flash("error", "items were not deleted");
			//res.redirect("back");
			console.log(err);
		}
		else{
			req.flash("success","items were deleted");
		}
		res.redirect("back");
	});
});

//GET USERS FOR OTHER'S LISTS PAGE
router.get("/otherslists", function(req,res){
	var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        User.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, users) {
            User.countDocuments({name: regex}).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    res.redirect("back");
                } else {
                    if(users.length < 1) {
                        noMatch = "No users match that search, please try again.";
                    }
                    res.render("userEJSs/", {
                        users: users,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all users from DB
        User.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, users) {
            User.countDocuments().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("userEJSs/otherslists", {
                        users: users,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
        });
    }
});

//SHOW OTHER USERS PROFILE
router.get("/users/:username", userToLowerCaseParams, function(req,res){
	User.findOne({username: req.params.username}, function(err,foundUser){
		if(err){
			console.log(err);
		}
		else{
			res.render("userEJSs/otherprofile", {user:foundUser});
		}
	});
});

//SHOW MY PROFILE
router.get("/myprofile", checkUserOwnership, function(req,res){
	User.findOne({username:req.user.username}, function(err,foundUser){
		if(err){
			console.log(err);
		}
		else{
			res.render("userEJSs/myprofile", {user:foundUser});
		}
	});
});

//UPDATE MY PROFILE
router.put("/myprofile", checkUserOwnership, upload.single('image'), function(req,res){
	User.findOne({username:req.user.username}, async function(err,foundUser){
		if(err){
			console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
              try {
                  await cloudinary.v2.uploader.destroy(foundUser.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  foundUser.imageId = result.public_id;
                  foundUser.image = result.secure_url;
				  foundUser.save();
              } catch(err) {
				  console.log(err);
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
    User.findOne({username:req.body.user.username.toLowerCase()},function(err,existingUser){
		if(existingUser == null){
			User.findOne({email:req.body.user.email},function(err,existingEmail){
				if(existingEmail == null){
					foundUser.username = req.body.user.username.toLowerCase();
					foundUser.fName = req.body.user.fName;
					foundUser.lName = req.body.user.lName;
					foundUser.email = req.body.user.email;
					foundUser.save();
					req.flash("success","Successfully Updated!");
					res.redirect("/myprofile");
				}
				else{
					req.flash("error","Someone else has that email, please enter a different one");
					res.redirect("/myprofile");
				}
			});
        }
		else{
			req.flash("error","Someone else has that username, please enter a different one");
			res.redirect("/myprofile");
		}
	});
        }
	});
});

//DELETE PROFILE FROM MY PROFILE PAGE
router.delete("/myprofile",function(req,res){
	eval(require("locus"));
	User.findByIdAndRemove(req.user._id, function(err){
		if(err){
			req.flash("error","Your profile couldn't be deleted, please try again.");
			res.redirect("back");
		}
		else{
			req.flash("error","Your profile was deleted. We hope you'll be back soon!");
			res.redirect("/");
		}
	})
});

//MIDDLEWARE

//function for search on other's lists page
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

function userToLowerCaseParams(req,res,next){
	req.params.username = req.params.username.toLowerCase();
	next();
}

function userToLowerCaseBody(req,res,next){
	req.body.user.username = req.body.user.username.toLowerCase();
	next();
}

function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	else{
		req.flash("error","You need to be signed in to do this");
		res.redirect("/signin");
	}
};

function checkUserOwnership(req,res,next){
	//is user logged in?
	if(req.isAuthenticated()){
		//yes, find User  
		User.findOne({username:req.user.username},function(err,foundUser){
			if(err){
				req.flash("error","Could not find user, please try again!");
				res.redirect("back");
			}
			else{
				if(foundUser.username !== null){
					if(foundUser.username === req.user.username){ 
						next();
					}
					else{
						req.flash("error","Could not find user, or you do not have access to this page, please try again!");
						res.redirect("/");
					}
				}
				else{
					req.flash("error","Could not find user, or you do not have access to this page, please try again!");
					res.redirect("/");
				}
			}
		});
	}
	else{
		req.flash("error","Please sign in.");
		res.redirect("/signin");
	}
};

module.exports = router;