var mongoose = require("mongoose"),
	passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
	username: {type: String, unique: true, required: true},
	password: String,
	good: [{
		text: {type: String},
		checked: {type: Boolean, default: false}
	}],
	myself: [{
		text: {type: String},
		checked: {type: Boolean, default: false}
	}],
	email: {type: String, unique: true, required: true},
	image: {type: String, default:"https://res.cloudinary.com/thankfull/image/upload/v1588527506/profile-42914_960_720_zzcn7l.png"},
	imageId: {type: String, default:"v1588527506"},
	fName: String,
	lName: String,
	resetPasswordToken: String,
    resetPasswordExpires: Date,
	comments:[{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Comment"
	}]
});

UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User",UserSchema);