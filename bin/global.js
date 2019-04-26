#!/usr/bin/env node
var lib = require('../index.js');
const args = process.argv.slice(2)
const dir = args.length ? args[0] : process.cwd();
lib.main(dir);