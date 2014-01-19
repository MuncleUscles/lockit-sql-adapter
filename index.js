
var uuid = require('uuid');
var bcrypt = require('bcrypt');
var ms = require('ms');
var moment = require('moment');
var Sequelize = require('sequelize');

module.exports = function(config) {

  var sequelize = new Sequelize(config.dbUrl);
  
  var User = sequelize.define('User', {
    // make id like CouchDB and MongoDB
    _id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // signup
    username: Sequelize.STRING,
    email: Sequelize.STRING,
    hash: Sequelize.STRING,
    signupToken: Sequelize.STRING,
    signupTimestamp: Sequelize.DATE,
    signupTokenExpires: Sequelize.DATE,
    failedLoginAttempts: Sequelize.INTEGER,
    emailVerificationTimestamp: Sequelize.DATE,
    emailVerified: Sequelize.BOOLEAN,
    // forgot password
    pwdResetToken: Sequelize.STRING,
    pwdResetTokenExpires: Sequelize.DATE,
    // login
    accountLocked: Sequelize.BOOLEAN,
    accountLockedUntil: Sequelize.DATE,
    previousLoginTime: Sequelize.DATE,
    previousLoginIp: Sequelize.STRING,
    currentLoginTime: Sequelize.DATE,
    currentLoginIp: Sequelize.STRING
  }, {
    tableName: config.dbCollection,   // this will define the table's name
    timestamps: false                 // this will deactivate the timestamp columns
  });

  User.sequelize.sync({
//    force: true
  }).success(function(err) {
        
    // you can now use User to create new instances
        
  }).error(function(err) {
    console.log(err);
  });
  
  var adapter = {};
  
  // create a new user
  adapter.save = function(name, email, pw, done) {

    var now = moment().toDate();
    var timespan = ms(config.signupTokenExpiration);
    var future = moment().add(timespan, 'ms').toDate();

    // create hashed password
    bcrypt.hash(pw, 10, function(err, hash) {
      if (err) return done(err);
      
      var user = User.build({
        username: name,
        email: email,
        signupToken: uuid.v4(),
        signupTimestamp: now,
        signupTokenExpires: future,
        failedLoginAttempts: 0,
        hash: hash
      });
      
      // save user to db
      user.save().success(function() {

        // find user to return it in callback
        User.find({ where: {email: email} }).success(function(user) {
          done(null, user.dataValues);
        }).error(function(err) {
          done(err);
        });
        
      }).error(function(err) {
        done(err);
      });

    });
    
  };
  
  // find a user in db
  // match is either "username", "email" or "signupToken"
  adapter.find = function(match, query, done) {

    var qry = {};
    qry[match] = query;

    User.find({ where: qry }).success(function(user) {
      
      // create empty object in case no user is found
      user = user || {};
      
      done(null, user.dataValues);
    }).error(function(err) {
      done(err);
    });
    
  };
  
  // update an existing user
  adapter.update = function(user, done) {
    
    User.update(user, {_id: user._id}).success(function() {
          
      User.find(user._id).success(function(user) {
        done(null, user.dataValues);
      }).error(function(err) {
        done(err);
      });
        
    }).error(function(err) {
      done(err);
    });
    
  };

  // remove an existing user from db
  adapter.remove = function(match, query, done) {

    var qry = {};
    qry[match] = query;

    User.find({ where: qry }).success(function(user) {
      
      if (!user) return done(new Error('lockit - Cannot find ' + match + ': "' + query + '"'));

      user.destroy().success(function() {
        done(null, true);
      }).error(function(err) {
        done(err);
      });
      
    }).error(function(err) {
      done(err);
    });
    
  };
  
  return adapter;

};