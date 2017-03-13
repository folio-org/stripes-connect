# Change history for stripes-connect

## (IN PROGRESS)

* Fix test-suite to correctly invoke logger-extended API of `RESTResource.js`'s internal function `substitutePath`.

## [0.1.0](https://github.com/folio-org/stripes-connect/tree/v0.1.0) (Sun Mar 12 23:28:01 GMT 2017)

* `connect()` now accepts and uses an optional third argument, `logger` -- a logger fulfilling the API exemplified by [stripes-logger](https://github.com/folio-org/stripes-logger). If no argument is passed, a very basic logger is used that simply falls back to console.log
* The logger object is now used for some (not yet all) internal logging, and is also passed to path functions.
* `connectFor()` now curries a second argument: a logger as well as a module.

## [0.0.9](https://github.com/folio-org/stripes-connect/tree/v0.0.9) (2017-03-01)

* Add optional "status" element to the object passed to error-handlers. See https://github.com/folio-org/stripes-connect/blob/master/doc/api.md#error-handling for details. Fixes STRIPES-224.

## 0.0.8 (2017-02-24)

* First version to have a documented change-log. Each subsequent version will describe its differences from the previous one.
