/**
 * Compatibility Shim for Test Runner
 * Re-exports/executes tests/test-golden-flow-e2e.js
 */
const path = require("path");
require(path.join(__dirname, "..", "tests", "test-golden-flow-e2e.js"));
