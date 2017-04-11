var db      = require('../db.js');
var config  = require('../config.js');
var helpers = require('./helpers.js');
var winston = require('winston');
var assert  = require('assert');
var bcrypt  = require('bcrypt');

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////
function getRandom(min, max) {
     return Math.floor(Math.random() * (max - min) + min);
}

function findUserByEmail(email,cb){
     db.UserModel.findByEmail(email,function(err,users){
          winston.info('FOUND users: ' + users.length);

          if(err){
               winston.error('No users in DB by orderId: ' + err);
               return cb(err);
          }

          if(typeof(users)==='undefined' || (users.length!=1)){
               assert.equal(users.length<=1,true);

               winston.info('No user in DB for orderId: ' + email);
               return cb(null,null);
          }

          cb(null,users[0]);
     });
}

function generateNewUserId(cb){
     // loop until unique ID is found 
     var id = getRandom(1, 999999999);

     db.UserModel.findByShortId(id,function(err,orders){
          if(orders.length==0){
               return cb(id);
          }

          // continue - recurse
          generateNewUserId(cb);
     });
}

function changeBalanceBy(shortId,units,cb){
     if(!helpers.validateShortId(shortId)){
          winston.error('Bad shortId'); 
          return cb(null,null);
     }

     db.UserModel.findByShortId(shortId,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return cb(err,null);
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + shortId);
               return cb(null,null);
          }

          var user = users[0];
          if(!user.validated){
               winston.error('User not validated: ' + shortId);
               return cb(null,null);
          }

          var newBalance = user.balance + units;
 
          db.UserModel.findByIdAndUpdate(user._id, {$set:{balance:newBalance}}, {new: true}, function(err, user){
               if (err){ return cb(err) };
               cb(null,user);
          });
     });
}

function getUser(currentUser,shortId,cb){
     if(!helpers.validateShortId(shortId)){
          winston.error('Bad shortId');
          return cb(null,null);
     }

     if(currentUser.id!==shortId){
          winston.error('DATA for DIFFERENT ID is asked. HACKER DETECTED!!! ' + 
               currentUser.id + ' -> ' + shortId);

          return cb(null,null);
     }

     db.UserModel.findByShortId(shortId,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return cb(err,null);
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + shortId);
               return cb(null,null);
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];
          if(!user.validated){
               winston.error('User not validated: ' + shortId);
               return cb(null,null);
          }

          return cb(null,user);
     });
}

function createNewUser(name,lastName,email,pass,facebookID,needValidation,cb){
     var user = new db.UserModel; 
     user.email = email;

     // hash, salt
     bcrypt.hash(pass, config.get('auth:salt'), function(err, hash) {
          if(err){
               winston.error('Can not gen hash: ' + err);
               return cb(err);
          }

          user.password = hash;
          user.created = user.modified = Date.now();
          user.validated = !needValidation;
          user.validationSig = helpers.generateValidationSig(user.email,user.pass);
          user.comment = '';
          user.facebookID = facebookID;
          user.name = name;
          user.lastName = lastName;

          generateNewUserId(function(id){
               user.shortId = id;

               // 3 - return
               user.save(function(err){
                    if(err){
                         winston.error('Can not save user to DB: ' + err);
                         return cb(err);
                    }

                    winston.info('User created: ' + user.shortId);

                    var sub = new db.SubscriptionModel;
                    sub.userShortId = id;
                    sub.type = 1;       // free
                    sub.created = sub.modified = user.created;

                    // TODO: configure...
                    // add 30 days 
                    sub.expires.setDate(sub.created.getDate() + 30);

                    sub.save(function(err){
                         if(err){
                              winston.error('Can not save sub to DB: ' + err);
                              return cb(err);
                         }

                         return cb(null,user);
                    });
               });
          });
     });
}

function createLendingRequest(data, cb){
     var lendingRequest = new db.LendingRequestModel;
     lendingRequest.eth_count                = data.eth_count;
     lendingRequest.token_amount             = data.token_amount;
     lendingRequest.token_name               = data.token_name;
     lendingRequest.token_smartcontract      = data.token_smartcontract;
     lendingRequest.token_infolink           = data.token_infolink;
     lendingRequest.borrower_account_address = data.borrower_account_address;
     lendingRequest.borrower_id              = data.borrower_id;
     lendingRequest.days_to_lend             = data.days_to_lend;

     lendingRequest.current_state            = 1;
     lendingRequest.lender_account_address   = 'no_lender_address';  
     lendingRequest.lender_id                = 'no_lender_id';               
     lendingRequest.date_created             = Date.now();            
     lendingRequest.date_modified            = Date.now();  
     lendingRequest.days_left                = data.days_to_lend;       

     lendingRequest.save(function(err){
          if(err){
               winston.error('Can not save lending request to DB: ' + err);
               return cb(err);
          }

          changeBalanceBy(data.borrower_id, -1, function(err,user){
               if(err){
                    winston.error('Can`t change user`s balance: ' + err);
                    return cb(err);
               }     
               return cb(null, lendingRequest,user)
          })

     })
}

function getAllLRforUser(user, cb){
     db.LendingRequestModel.find({borrower_id: user.shortId},function(err,allLR){
          if(err){
               winston.error('Can`t find LR`s for user: ' + err);
               return cb(err);
          };
          var out = [];
          for (var i in allLR){
               out.push(allLR[i]._id)         
          };   
          cb(null, out)
     })
}

/////////////////////////////////////////////
exports.findUserByEmail = findUserByEmail;
exports.generateNewUserId = generateNewUserId;
exports.changeBalanceBy = changeBalanceBy;
exports.getUser = getUser;
exports.getAllLRforUser = getAllLRforUser;
exports.createNewUser = createNewUser;
exports.createLendingRequest = createLendingRequest;
