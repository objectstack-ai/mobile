/**
 * Mock for NativeWind's JSX runtime.
 * Redirects to React's native JSX runtime so that
 * JSX elements render correctly in tests.
 */
const React = require("react");
const ReactJSXRuntime = require("react/jsx-runtime");

module.exports = {
  jsx: ReactJSXRuntime.jsx,
  jsxs: ReactJSXRuntime.jsxs,
  Fragment: ReactJSXRuntime.Fragment,
  createElement: React.createElement,
};
