#! /bin/bash

# Run this one in parallel:
#   node_modules/.bin/testrpc --port 8989 --gasLimit 10000000
# 
# In config.json: 
#    "test_node":"http://138.201.89.68:8545"
#    "test_node":"http://localhost:8989"

#env SMART_CONTRACTS_ENABLED=true ETH_NODE=http://ethnode.chain.cloud:8545 ETH_MAIN_ADDRESS=0xf776478BCb25829C2FC07F14f2854B79C17E98d8 mocha --reporter spec -t 90000 -g "Contracts 0"

#env SMART_CONTRACTS_ENABLED=false ETH_NODE=http://localhost:8989 mocha --reporter spec -t 90000 -g "Users"
env ETH_NODE=http://localhost:8989 mocha --reporter spec -t 90000 -g "Users"

#-g "Contracts"

#mocha --reporter spec -t 90000 -g "Users"

#-g "Contracts 3"


#-g "What"


