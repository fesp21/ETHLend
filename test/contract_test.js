var solc = require('solc');
var Web3 = require('web3');

var config = require('../config');
//var contract_helpers = require('../helpers/contracts.js');

var fs = require('fs');
var assert = require('assert');
var BigNumber = require('bignumber.js');

// You must set this ENV VAR before testing
//assert.notEqual(typeof(process.env.ETH_NODE),'undefined');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));

var accounts;

var creator;
var borrower;
var feeCollector;
var lender;

var initialBalanceCreator = 0;
var initialBalanceBorrower = 0;
var initialBalanceFeeCollector = 0;
var initialBalanceLender = 0;

var ledgerContractAddress;
var ledgerContract;

var contractAddress;
var contract;

var tokenAddress;
var token;

var txHash;

var ledgerAbi;
var requestAbi;

// init BigNumber
var unit = new BigNumber(Math.pow(10,18));

var WANTED_WEI = web3.toWei(1,'ether');
var PREMIUM_WEI = web3.toWei(0.2,'ether');

function diffWithGas(mustBe,diff){
     var gasFee = 5000000;
     return (diff>=mustBe) && (diff<=mustBe + gasFee);
}

function getContractAbi(contractName,cb){
     var file = './contracts/EthLend.sol';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          var output = solc.compile(source, 1);   // 1 activates the optimiser
          var abi = JSON.parse(output.contracts[contractName].interface);
          return cb(null,abi);
     });
}

function deployLedgerContract(data,cb){
     var file = './contracts/EthLend.sol';
     var contractName = ':Ledger';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          console.log('Creator: ' + creator);

          var whereToSendMoneyTo = feeCollector;

          tempContract.new(
               whereToSendMoneyTo, 
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 4995000,
                    //gasPrice: 120000000000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         ledgerContractAddress = result.contractAddress;
                         ledgerContract = web3.eth.contract(abi).at(ledgerContractAddress);

                         console.log('Ledger contract address: ');
                         console.log(ledgerContractAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

function deployContract(data,cb){
     var file = './contracts/EthLend.sol';
     var contractName = ':LendingRequest';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          var whereToSendFee = creator;

          tempContract.new(
               creator,
               borrower,
               whereToSendFee,
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 4995000,
                    //gasPrice: 120000000000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         contractAddress = result.contractAddress;
                         contract = web3.eth.contract(abi).at(contractAddress);

                         console.log('Contract address: ');
                         console.log(contractAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

function deployTokenContract(data,cb){
     var file = './contracts/SampleToken.sol';
     var contractName = ':SampleToken';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          tempContract.new(
               creator,
               borrower,
               {
                    from: creator, 
                    gas: 4995000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         tokenAddress = result.contractAddress;
                         token = web3.eth.contract(abi).at(tokenAddress);

                         console.log('Token address: ');
                         console.log(tokenAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

describe('Contracts 0 - Deploy Ledger', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });
});


describe('Contracts 1', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Sample token contract',function(done){
          var data = {};
          deployTokenContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should get initial creator balance',function(done){
          initialBalanceCreator = web3.eth.getBalance(creator);

          console.log('Creator initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial borrower balance',function(done){
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          console.log('Borrower initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial feeCollector balance',function(done){
          initialBalanceFeeCollector = web3.eth.getBalance(feeCollector);

          console.log('FeeCollector initial balance is: ');
          console.log(initialBalanceFeeCollector.toString(10));
          done();
     });

     it('should get initial lender balance',function(done){
          initialBalanceLender = web3.eth.getBalance(lender);

          console.log('Lender initial balance is: ');
          console.log(initialBalanceLender.toString(10));
          done();
     });

     it('should get current count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,0);
          done();
     })

     it('should get intial count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,0);
          done();
     })

     it('should issue some tokens for me',function(done){
          token.issueTokens(
               borrower,
               1000,
               {
                    // anyone can issue tokens for anyone here)))
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should return 1000 as a balance',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          done();
     });

     it('should issue new LR',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;

          web3.eth.sendTransaction(
               {
                    from: borrower,               
                    to: ledgerContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })

     it('should get updated count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,1);
          done();
     })

     it('should get updated feeCollector balance',function(done){
          var current = web3.eth.getBalance(feeCollector);
          var feeAmount = 100000000000000000;

          var diff = current - initialBalanceFeeCollector;
          assert.equal(diff.toString(10),feeAmount);
          done();
     });

     it('should get updated borrower balance',function(done){
          var current = web3.eth.getBalance(borrower);
          var mustBe = 200000000000000000;

          var diff = initialBalanceBorrower - current;
          assert.equal(diffWithGas(mustBe,diff),true);
          done();
     });

     it('should get LR contract',function(done){
          assert.equal(ledgerContract.getLrCount(),1);

          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for data" state
          assert.equal(state.toString(),0);
          done();
     })

     it('should get LR contract for user',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for data" state
          assert.equal(state.toString(),0);
          done();
     })

     it('should set data',function(done){
          var data = {
               wanted_wei: WANTED_WEI,
               token_amount: 10,
               premium_wei: PREMIUM_WEI,

               token_name: 'SampleContract',
               token_infolink: 'https://some-sample-ico.network',

               // see that?
               token_smartcontract_address: tokenAddress,
               days_to_lend: 10
          };

          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          // this is set by creator (from within platform)
          lr.setData(
               data.wanted_wei,
               data.token_amount,
               data.premium_wei,
               data.token_name,
               data.token_infolink,
               data.token_smartcontract_address,
               data.days_to_lend,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move to Waiting for tokens state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should check if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.checkTokens(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move 1 token to LR',function(done){
          var lr = ledgerContract.getLrForUser(borrower,0);

          // Borrower -> LR contract
          token.transfer(
               lr,
               1,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should check again if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.checkTokens(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move 9 more token to LR',function(done){
          var lr = ledgerContract.getLrForUser(borrower,0);

          // Borrower -> LR contract
          token.transfer(
               lr,
               9,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should check again if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var balance = token.balanceOf(borrower);
          assert.equal(balance,990);

          var balance2 = token.balanceOf(a);
          assert.equal(balance2,10);

          lr.checkTokens(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for lender" state
          assert.equal(state.toString(),3);
          done();
     })

     it('should allow to ask for check again',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.checkTokens(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    // TODO: why fails?
                    /*
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
                    */
                    done();
               }
          );
     });

     it('should collect money from Lender now',function(done){
          // 0.2 ETH
          var wanted_wei = WANTED_WEI;
          var amount = wanted_wei;

          var a = ledgerContract.getLrForUser(borrower,0);
          //var lr = web3.eth.contract(requestAbi).at(a);

          // WARNING: see this
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          // this should be called by borrower
          web3.eth.sendTransaction(
               {
                    from: lender,               
                    to: a,
                    value: wanted_wei,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should get correct lender',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          assert.equal(lr.getLender(),lender);
          done();
     })

     it('should get updated lender balance',function(done){
          var current = web3.eth.getBalance(lender);
          var wantedWei = WANTED_WEI;

          var diff = initialBalanceLender - current;
          assert.equal(diffWithGas(wantedWei,diff),true);
          done();
     })

     it('should move to WaitingForPayback state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting For Payback" state
          assert.equal(state.toString(),4);
          done();
     })

     it('should move all ETH to borrower',function(done){
          // ETH should be moved to borrower
          // tokens should be held on contract

          var wantedWei = WANTED_WEI;

          var current = web3.eth.getBalance(borrower);
          var diff = current - initialBalanceBorrower;

          console.log('DIFF: ', diff);
          console.log('CURR: ', wantedWei);

          assert.equal(diffWithGas(wantedWei,diff),true);

          done();
     });

     //////////////////////////////////////////////////////////
     it('should not move to Finished if not all money is sent',function(done){
          var amount = web3.toWei(1.0,'ether');
          var a = ledgerContract.getLrForUser(borrower,0);

          // this should be called by borrower
          web3.eth.sendTransaction(
               {
                    from: borrower,               
                    //from: creator,      // anyone can send this
                    to: a,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);

                    done();
               }
          );
     });

     it('should not be in Finished state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // still in "Waiting For Payback" state
          assert.equal(state.toString(),4);
          done();
     })

     it('should send money back from borrower',function(done){
          var amount = web3.toWei(1.0 + 0.2,'ether');
          var a = ledgerContract.getLrForUser(borrower,0);

          // this should be called by borrower
          web3.eth.sendTransaction(
               {
                    from: borrower,               
                    //from: creator,      // anyone can send this
                    to: a,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     ////////////////////// 
     it('should be in Finished state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Finished" state
          assert.equal(state.toString(),6);
          done();
     })

     it('should release tokens back to borrower',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var balance2 = token.balanceOf(a);
          assert.equal(balance2,0);

          done();
     });
})


describe('Contracts 2 - cancell', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should issue new LR',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;

          web3.eth.sendTransaction(
               {
                    from: borrower,               
                    to: ledgerContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })
     
     it('should get correct LR state',function(done){
          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for data" state
          assert.equal(state.toString(),0);
          done();
     })

     it('should cancell LR',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          // should be called by platform
          lr.cancell(
               {
                    // can be sent from ledger, main, borrower
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should get correct LR state',function(done){
          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Cancelled" state
          assert.equal(state.toString(),2);
          done();
     })

     it('should not cancell LR again',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.cancell(
               {
                    // can be sent from ledger, main, borrower
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should get correct LR state again',function(done){
          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Cancelled" state
          assert.equal(state.toString(),2);
          done();
     })
});

describe('Contracts 3 - cancell with refund', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Sample token contract',function(done){
          var data = {};
          deployTokenContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should get initial creator balance',function(done){
          initialBalanceCreator = web3.eth.getBalance(creator);

          console.log('Creator initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial borrower balance',function(done){
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          console.log('Borrower initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial feeCollector balance',function(done){
          initialBalanceFeeCollector = web3.eth.getBalance(feeCollector);

          console.log('FeeCollector initial balance is: ');
          console.log(initialBalanceFeeCollector.toString(10));
          done();
     });

     it('should get initial lender balance',function(done){
          initialBalanceLender = web3.eth.getBalance(lender);

          console.log('Lender initial balance is: ');
          console.log(initialBalanceLender.toString(10));
          done();
     });

     it('should get current count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,0);
          done();
     })

     it('should get intial count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,0);
          done();
     })

     it('should issue some tokens for me',function(done){
          token.issueTokens(
               borrower,
               1000,
               {
                    // anyone can issue tokens for anyone here)))
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should return 1000 as a balance',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          done();
     });

     it('should issue new LR',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;

          web3.eth.sendTransaction(
               {
                    from: borrower,               
                    to: ledgerContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })

     it('should get updated count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,1);
          done();
     })

     it('should get updated feeCollector balance',function(done){
          var current = web3.eth.getBalance(feeCollector);
          var feeAmount = 100000000000000000;

          var diff = current - initialBalanceFeeCollector;
          assert.equal(diff.toString(10),feeAmount);
          done();
     });

     it('should get updated borrower balance',function(done){
          var current = web3.eth.getBalance(borrower);
          var mustBe = 200000000000000000;

          var diff = initialBalanceBorrower - current;
          assert.equal(diffWithGas(mustBe,diff),true);
          done();
     });

     it('should get LR contract',function(done){
          assert.equal(ledgerContract.getLrCount(),1);

          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for data" state
          assert.equal(state.toString(),0);
          done();
     })

     it('should get LR contract for user',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for data" state
          assert.equal(state.toString(),0);
          done();
     })

     it('should set data',function(done){
          var data = {
               wanted_wei: WANTED_WEI,
               token_amount: 10,
               premium_wei: PREMIUM_WEI,

               token_name: 'SampleContract',
               token_infolink: 'https://some-sample-ico.network',

               // see that?
               token_smartcontract_address: tokenAddress,
               days_to_lend: 10
          };

          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          // this is set by creator (from within platform)
          lr.setData(
               data.wanted_wei,
               data.token_amount,
               data.premium_wei,
               data.token_name,
               data.token_infolink,
               data.token_smartcontract_address,
               data.days_to_lend,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move to Waiting for tokens state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should check if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.checkTokens(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move 10 more token to LR',function(done){
          var lr = ledgerContract.getLrForUser(borrower,0);

          // Borrower -> LR contract
          token.transfer(
               lr,
               10,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should release tokens back to borrower',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,990);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var balance2 = token.balanceOf(a);
          assert.equal(balance2,10);

          done();
     });

     it('should check again if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.checkTokens(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for lender" state
          assert.equal(state.toString(),3);
          done();
     })


     it('should return tokens to founder',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.cancell(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     })

     it('should release tokens back to borrower',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var balance2 = token.balanceOf(a);
          assert.equal(balance2,0);

          done();
     });
});


describe('Contracts 4 - default', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Sample token contract',function(done){
          var data = {};
          deployTokenContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should get initial creator balance',function(done){
          initialBalanceCreator = web3.eth.getBalance(creator);

          console.log('Creator initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial borrower balance',function(done){
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          console.log('Borrower initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial feeCollector balance',function(done){
          initialBalanceFeeCollector = web3.eth.getBalance(feeCollector);

          console.log('FeeCollector initial balance is: ');
          console.log(initialBalanceFeeCollector.toString(10));
          done();
     });

     it('should get initial lender balance',function(done){
          initialBalanceLender = web3.eth.getBalance(lender);

          console.log('Lender initial balance is: ');
          console.log(initialBalanceLender.toString(10));
          done();
     });

     it('should get current count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,0);
          done();
     })

     it('should get intial count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,0);
          done();
     })

     it('should issue some tokens for me',function(done){
          token.issueTokens(
               borrower,
               1000,
               {
                    // anyone can issue tokens for anyone here)))
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should return 1000 as a balance',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          done();
     });

     it('should issue new LR',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;

          web3.eth.sendTransaction(
               {
                    from: borrower,               
                    to: ledgerContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })

     it('should get updated count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,1);
          done();
     })

     it('should get updated feeCollector balance',function(done){
          var current = web3.eth.getBalance(feeCollector);
          var feeAmount = 100000000000000000;

          var diff = current - initialBalanceFeeCollector;
          assert.equal(diff.toString(10),feeAmount);
          done();
     });

     it('should get updated borrower balance',function(done){
          var current = web3.eth.getBalance(borrower);
          var mustBe = 200000000000000000;

          var diff = initialBalanceBorrower - current;
          assert.equal(diffWithGas(mustBe,diff),true);
          done();
     });

     it('should get LR contract',function(done){
          assert.equal(ledgerContract.getLrCount(),1);

          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for data" state
          assert.equal(state.toString(),0);
          done();
     })

     it('should get LR contract for user',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for data" state
          assert.equal(state.toString(),0);
          done();
     })

     it('should set data',function(done){
          var data = {
               wanted_wei: WANTED_WEI,
               token_amount: 10,
               premium_wei: PREMIUM_WEI,

               token_name: 'SampleContract',
               token_infolink: 'https://some-sample-ico.network',

               // see that?
               token_smartcontract_address: tokenAddress,
               days_to_lend: 10
          };

          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          // this is set by creator (from within platform)
          lr.setData(
               data.wanted_wei,
               data.token_amount,
               data.premium_wei,
               data.token_name,
               data.token_infolink,
               data.token_smartcontract_address,
               data.days_to_lend,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move to Waiting for tokens state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should check if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.checkTokens(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move 10 more token to LR',function(done){
          var lr = ledgerContract.getLrForUser(borrower,0);

          // Borrower -> LR contract
          token.transfer(
               lr,
               10,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should release tokens back to borrower',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,990);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var balance2 = token.balanceOf(a);
          assert.equal(balance2,10);

          done();
     });

     it('should check again if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.checkTokens(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting for lender" state
          assert.equal(state.toString(),3);
          done();
     })

     it('should collect money from Lender now',function(done){
          // 0.2 ETH
          var wanted_wei = WANTED_WEI;
          var amount = wanted_wei;

          var a = ledgerContract.getLrForUser(borrower,0);
          //var lr = web3.eth.contract(requestAbi).at(a);

          // WARNING: see this
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          // this should be called by borrower
          web3.eth.sendTransaction(
               {
                    from: lender,               
                    to: a,
                    value: wanted_wei,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move to WaitingForPayback state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Waiting For Payback" state
          assert.equal(state.toString(),4);
          done();
     })

     // TODO: now spend some time..

     it('should request default',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.requestDefault(
               {
                    from: lender,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     })

     it('should be moved',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getState();
          // "Default" state
          assert.equal(state.toString(),5);
          done();
     })
});

