#! /bin/bash

env SMART_CONTRACTS_ENABLED=true ETH_NODE=http://ethnode.chain.cloud:8545 ETH_MAIN_ADDRESS=0xf776478BCb25829C2FC07F14f2854B79C17E98d8 ETH_CREATOR_ADDRESS=0xb9af8aa42c97f5a1f73c6e1a683c4bf6353b83e7 node scripts/new_request.js
