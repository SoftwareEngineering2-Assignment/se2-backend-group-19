const express = require('express');
const {validation, authorization} = require('../middlewares');
const {helpers: {jwtSign}} = require('../utilities/authentication');

const {mailer: {mail, send}} = require('../utilities');

const router = express.Router();

const User = require('../models/user');
const Reset = require('../models/reset');

/**
 * POST request to create and validate a new user
 */
router.post('/create',
  (req, res, next) => validation(req, res, next, 'register'),
  async (req, res, next) => {
    const {username, password, email} = req.body;
    try {
      const user = await User.findOne({$or: [{username}, {email}]});

      // error case if there is already a user with the same username or e-mail
      if (user) {
        return res.json({
          status: 409,
          message: 'Registration Error: A user with that e-mail or username already exists.'
        });
      }

      // create new user
      const newUser = await new User({
        username,
        password,
        email
      }).save();

      return res.json({success: true, id: newUser._id});
    } catch (error) {
      return next(error);
    }
  });

  /**
   * POST request to authenticate a user by username and password
   */
router.post('/authenticate',
  (req, res, next) => validation(req, res, next, 'authenticate'),
  async (req, res, next) => {
    const {username, password} = req.body;
    try {
      const user = await User.findOne({username}).select('+password');

      // error case if there is no user with the username given
      if (!user) {
        return res.json({
          status: 401,
          message: 'Authentication Error: User not found.'
        });
      }

      // error case if the password is not correct
      if (!user.comparePassword(password, user.password)) {
        return res.json({
          status: 401,
          message: 'Authentication Error: Password does not match!'
        });
      }

      // dafault case where the username and password are correct
      return res.json({
        user: {
          username, 
          id: user._id, 
          email: user.email
        },
        token: jwtSign({username, id: user._id, email: user.email})
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * POST request to reset a user's password
   */
router.post('/resetpassword',
  (req, res, next) => validation(req, res, next, 'request'),
  async (req, res, next) => {
    const {username} = req.body;
    try {
      const user = await User.findOne({username});

      // error case if there is no user with the username given
      if (!user) {
        return res.json({
          status: 404,
          message: 'Resource Error: User not found.'
        });
      }

      // reset the user's account
      const token = jwtSign({username});
      await Reset.findOneAndRemove({username});
      await new Reset({
        username,
        token,
      }).save();

      // send email to user to change passwords
      const email = mail(token);
      send(user.email, 'Forgot Password', email);
      return res.json({
        ok: true,
        message: 'Forgot password e-mail sent.'
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * POST request to change a user's password
   */
router.post('/changepassword',
  (req, res, next) => validation(req, res, next, 'change'),
  authorization,
  async (req, res, next) => {
    const {password} = req.body;
    const {username} = req.decoded;
    try {
      const user = await User.findOne({username});

      // error case if there is no user with the username given
      if (!user) {
        return res.json({
          status: 404,
          message: 'Resource Error: User not found.'
        });
      }

      // reset user's accout
      const reset = await Reset.findOneAndRemove({username});

      // error case if reset token has expired
      if (!reset) {
        return res.json({
          status: 410,
          message: ' Resource Error: Reset token has expired.'
        });
      }
      user.password = password;
      await user.save();
      return res.json({
        ok: true,
        message: 'Password was changed.'
      });
    } catch (error) {
      return next(error);
    }
  });

module.exports = router;
