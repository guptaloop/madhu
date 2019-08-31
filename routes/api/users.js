const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
// allow users to sign in and access protected routes
const jwt = require('jsonwebtoken');
const passport = require('passport');
// import the secretOrKey session token
const keys = require('../../config/keys');
// custom validations
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');

// sign up & register route
router.post('/register', (req, res) => {

	// Validations
	const { errors, isValid } = validateRegisterInput(req.body);
	if (!isValid) {
		return res.status(400).json(errors);
	}

	// Check to make sure nobody has already registered with a dupe handle
	User.findOne({ handle: req.body.handle }).then(user => {
			if (user) {
				errors.handle = "User handle already exists";
				return res.status(400).json(errors);
			} else {
				// Otherwise create a new user from the User model
				const newUser = new User({
					handle: req.body.handle,
					email: req.body.email,
					password: req.body.password
				});
				// salt and hash the password before saving to the db
				bcrypt.genSalt(10, (err, salt) => {
					bcrypt.hash(newUser.password, salt, (err, hash) => {
						if (err) throw err;
						newUser.password = hash;
						newUser
							.save()
							.then(user => {
								const payload = { id: user.id, handle: user.handle };

								jwt.sign(payload, keys.secretOrKey, { expiresIn: 3600 }, 
									(err, token) => {
										res.json({
											success: true,
											token: "Bearer " + token
										});
								});
							})
							.catch(err => console.log(err));
					});
				});
			}
		});
});

// login route
router.post("/login", (req, res) => {

	// Validations
	const { errors, isValid } = validateLoginInput(req.body);
	if (!isValid) {
		return res.status(400).json(errors);
	}

	const email = req.body.email;
	const password = req.body.password;

	User.findOne({ email }).then(user => {
		if (!user) {
			errors.email = "This user does not exist";
			return res.status(400).json(errors);
		}

		bcrypt.compare(password, user.password).then(isMatch => {
			if (isMatch) {
				const payload = { id: user.id, email: user.email };

				jwt.sign(payload, keys.secretOrKey, { expiresIn: 3600 }, 
					(err, token) => {
						res.json({
							success: true,
							token: "Bearer " + token
						});
				});
			} else {
				errors.password = "Incorrect password";
				return res.status(400).json(errors);
			}
		});
	});
});

// get current user 
router.get('/current',
	passport.authenticate('jwt', { session: false }), (req, res) => {
		res.json({ 
			id: req.user.id,
			handle: req.user.handle,
			email: req.user.email,
		});
	}
);

module.exports = router;