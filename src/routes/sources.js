/* eslint-disable max-len */
const express = require('express');
const mongoose = require('mongoose');
const {authorization} = require('../middlewares');

const router = express.Router();

const Source = require('../models/source');

/**
 * GET request to retrieve all the source components of a specific user
 */
router.get('/sources',
  authorization,
  async (req, res, next) => {
    try {
      const {id} = req.decoded;
      const foundSources = await Source.find({owner: mongoose.Types.ObjectId(id)});
      const sources = [];
      foundSources.forEach((s) => {
        sources.push({
          id: s._id,
          name: s.name,
          type: s.type,
          url: s.url,
          login: s.login,
          passcode: s.passcode,
          vhost: s.vhost,
          active: false
        });
      });

      return res.json({
        success: true,
        sources
      });
    } catch (err) {
      return next(err.body);
    }
  });

  /**
   * POST request to create a new source component 
   */
router.post('/create-source', 
  authorization,
  async (req, res, next) => {
    try {
      const {name, type, url, login, passcode, vhost} = req.body;
      const {id} = req.decoded;
      const foundSource = await Source.findOne({owner: mongoose.Types.ObjectId(id), name});

      // error case if new source's name is already used
      if (foundSource) {
        return res.json({
          status: 409,
          message: 'A source with that name already exists.'
        });
      }
      // create new source
      await new Source({
        name,
        type,
        url,
        login,
        passcode,
        vhost,
        owner: mongoose.Types.ObjectId(id)
      }).save();

      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

  /**
   * POST request to change a specific sourse component of a user
   */
router.post('/change-source', 
  authorization,
  async (req, res, next) => {
    try {
      const {id, name, type, url, login, passcode, vhost} = req.body;
      const foundSource = await Source.findOne({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)});
      
      // error case if there is no source with the id and owner given
      if (!foundSource) {
        return res.json({
          status: 409,
          message: 'The selected source has not been found.'
        });
      }
      
      const sameNameSources = await Source.findOne({_id: {$ne: mongoose.Types.ObjectId(id)}, owner: mongoose.Types.ObjectId(req.decoded.id), name});
      
      // error case if new source's name is already used
      if (sameNameSources) {
        return res.json({
          status: 409,
          message: 'A source with the same name has been found.'
        });
      }

      // change source
      foundSource.name = name;
      foundSource.type = type;
      foundSource.url = url;
      foundSource.login = login;
      foundSource.passcode = passcode;
      foundSource.vhost = vhost;
      await foundSource.save();

      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

  /**
   * POST request to delete a specific source component of a user
   */
router.post('/delete-source', 
  authorization,
  async (req, res, next) => {
    try {
      const {id} = req.body;

      const foundSource = await Source.findOneAndRemove({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)});
      // error case if there is no source with the id and owner given
      if (!foundSource) {
        return res.json({
          status: 409,
          message: 'The selected source has not been found.'
        });
      }
      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

  /**
   * POST request to find a specific source component by its name
   */
router.post('/source',
  async (req, res, next) => {
    try {
      const {name, owner, user} = req.body;
      const userId = (owner === 'self') ? user.id : owner;
      const foundSource = await Source.findOne({name, owner: mongoose.Types.ObjectId(userId)});
      // error case if there is no source with the name and owner given
      if (!foundSource) {
        return res.json({
          status: 409,
          message: 'The selected source has not been found.'
        });
      }

      const source = {};
      source.type = foundSource.type;
      source.url = foundSource.url;
      source.login = foundSource.login;
      source.passcode = foundSource.passcode;
      source.vhost = foundSource.vhost;
    
      return res.json({
        success: true,
        source
      });
    } catch (err) {
      return next(err.body);
    }
  });

  /**
   * POST request to check given source components of a specific user
   */
router.post('/check-sources',
  authorization,
  async (req, res, next) => {
    try {
      const {sources} = req.body;
      const {id} = req.decoded;

      const newSources = [];

      // add new sources 
      for (let i = 0; i < sources.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const result = await Source.findOne({name: sources[i], owner: mongoose.Types.ObjectId(id)});
        if (!result) {
          newSources.push(sources[i]);
        }
      }

      for (let i = 0; i < newSources.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Source({
          name: newSources[i],
          type: 'stomp',
          url: '',
          login: '',
          passcode: '',
          vhost: '',
          owner: mongoose.Types.ObjectId(id)
        }).save();
      } 
      
      return res.json({
        success: true,
        newSources
      });
    } catch (err) {
      return next(err.body);
    }
  });

module.exports = router;
