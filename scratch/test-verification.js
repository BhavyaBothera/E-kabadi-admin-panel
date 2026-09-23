/**
 * Compatibility Shim for Test Runner
 * Re-exports/executes tests/test-verification.js
 */
const path = require("path");
require(path.join(__dirname, "..", "tests", "test-verification.js"));
