# Change history for stripes-connect

## 3.2.0 (IN PROGRESS)

* `verbOptions` returns null if any of the templated values are incomplete. Fixes STCON-58.
* Failed fetches on a resource clear existing data from that resource. Fixes STCON-64. Available from v3.1.1.
* Added ability to specify `throwErrors` boolean in resource manifests. Setting to `false` turns off global error reporting for that resource. Available from v3.1.2.
* Allow LocalResource to be initalized with a non-object falsey value. Refs STCON-65. Available from v3.1.3.
* Updating `connect` documentation.
* Add a new `permissionsRequired` prop to a manifest's object. Fixes STCON-68. Available from v3.1.5.

## [3.1.0](https://github.com/folio-org/stripes-connect/tree/v3.1.0) (2018-01-09)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v3.0.0...v3.1.0)

* Document use of GET mutators. Fixes STCON-53.
* Enable `RESTResource.js` to get `totalRecords` from the location inside `resultInfo`, which is where mod-codex-mux puts it. Fixes STCON-55.

## [3.0.0](https://github.com/folio-org/stripes-connect/tree/v3.0.0) (2017-12-05)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.7.0...v3.0.0)

* Remove `props.data`, resources are now exclusively accessed via `props.resources`. Fixes STCON-22, and makes this release backwards-incompatible (hence the major version-number bump).
* Replace redux-crud with our own actions and reducer. Fixes STCON-15.
* Consistent redux store prefix for local resources. Fixes STCON-36.
* Provide `accumulate` manifest option to enable explicit GET actions. Fixes STCON-33.
* Avoid unnecessary additional calls in mutation epic. Fixes STCON-46.
* Repopulate mutator after re-mounting a connected component. Fixes STCON-40.
* Pass `dataKey` into `substitute`, so it can pass it through to `mockProps`. Allows `mockProps` to work properly with `dataKey` for the first time with the new dataKey-at-connect-time convention of STCON-40. Fixes STCON-50.
* Add logging for `mockProps` (using category `"mock"`). Needed to debug UIORG-38.
* Fix integration tests. Fixes STCON-41.

## [2.7.0](https://github.com/folio-org/stripes-connect/tree/v2.7.0) (2017-09-01)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.6.0...v2.7.0)

* `reducer111` acts only when action and resource dataKeys match. Finally fixes STCON-9.

## [2.6.0](https://github.com/folio-org/stripes-connect/tree/v2.6.0) (2017-08-28)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.5.1...v2.6.0)

* Return promises from mutators. STCON-27.

## [2.5.1](https://github.com/folio-org/stripes-connect/tree/v2.5.1) (2017-08-15)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.5.0...v2.5.1)

* Update stripes-redux dependency. SRDX-1 and SRDX-2.

## [2.5.0](https://github.com/folio-org/stripes-connect/tree/v2.5.0) (2017-08-04)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.4.0...v2.5.0)

* Introduce side effects. Fixes STCON-16.
* Simpler action-type strings in `RESTResource.js`. As a result, components using `this.props.resources` work correctly with dataKey. Fixes STCON-9.
* Expose errors in resource metadata. STCON-20.

## [2.4.0](https://github.com/folio-org/stripes-connect/tree/v2.4.0) (2017-07-11)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.3.0...v2.4.0)

* Support `dataKey` to have different instances of a component maintain their own data. This is a "major" change in that affects a lot of the internals and provides significant new functionality; but since it is backwards-compatible -- components without a `dataKey` behave the same as before -- it can be released as a non-breaking minor release. Fixes STRPCONN-1.

## [2.3.0](https://github.com/folio-org/stripes-connect/tree/v2.3.0) (2017-06-29)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.2.1...v2.3.0)

* `createAction` copes with 201 Created responses that have no body. Fixes STRPCONN-2.
* Report error when the designated `records` element is missing. Fixes STRPCONN-3.
* Perform substitutions on `records` as well as `path`. Fixes STRPCONN-4.
* In substitutions, recognise `%{name}` as well as `${name}` for querying resources. Fixes STRPCONN-5.

## [2.2.1](https://github.com/folio-org/stripes-connect/tree/v2.2.1) (2017-06-09)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.2.0...v2.2.1)

* Fix failure of paging to handle case where requested records exceed those available and allow paging to find available records under an alternate name used by some services.

## [2.2.0](https://github.com/folio-org/stripes-connect/tree/v2.2.0) (2017-06-08)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.1.0...v2.2.0)

* Initial work exposing resources with richer metadata in `props.resources`. API for this not yet fully formed, discussion in STRIPES-111.

## [2.1.0](https://github.com/folio-org/stripes-connect/tree/v2.1.0) (2017-05-22)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v2.0.0...v2.1.0)

* Fix implementation of `!{prop.subprop}` in manifest-path substitution.

## [2.0.0](https://github.com/folio-org/stripes-connect/tree/v2.0.0) (2017-05-12)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v1.0.0...v2.0.0)

* Remove 'clear' manifest option and ability to merge resources.
* Manifest functions are permitted to return more than just strings.
* Pass through 'okapi' property from the store as a prop, eventually we will make this a general facility.

## [1.0.0](https://github.com/folio-org/stripes-connect/tree/v1.0.0) (2017-05-09)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v0.3.0...v1.0.0)

* Initial support for paging. Documented in the API guide, particularly the `requiredRecords` manifest entry.
* Query parameters now broken out into a `params` property in the manifest.
* Remove the old _Thinking in Stripes_ document, which is now a section in the _Stripes Module Developer's Guide_ in stripes-core.
* Bump to major version 1, so that semantic versioning will start working correctly, allowing NPM dependencies to identify forwards-compatible newer minor versions.

## [0.3.0](https://github.com/folio-org/stripes-connect/tree/v0.3.0) (2017-04-06)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v0.2.0...v0.3.0)

* Add support for new `!{prop.subprop}` syntax in path strings,
  substituting in the value of a property from the component. Document
  this in the API guide. Fixes STRIPES-299.
* Remove the obsolete stub `api.md` file from the root directory. The
  API guide has been in the `doc` directory for a long tine now.

## [0.2.0](https://github.com/folio-org/stripes-connect/tree/v0.2.0) (2017-03-23)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v0.1.0...v0.2.0)

* Switch to using the new release of [React Router](https://reacttraining.com/react-router/). This significantly changes the API for URL-derived props and for changing the URL. In addition to their detailed documentation you may also find [this commit](https://github.com/folio-org/ui-items/commit/adf24349efef3bf2dc5928c8a76a5991369577b9) illustrative.

## [0.1.0](https://github.com/folio-org/stripes-connect/tree/v0.1.0) (2017-03-12)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v0.0.9..v0.1.0)

* `connect()` now accepts and uses an optional third argument, `logger` -- a logger fulfilling the API exemplified by [stripes-logger](https://github.com/folio-org/stripes-logger). If no argument is passed, a very basic logger is used that simply falls back to console.log
* The logger object is now used for some (not yet all) internal logging, and is also passed to path functions.
* `connectFor()` now curries a second argument: a logger as well as a module.

## [0.0.9](https://github.com/folio-org/stripes-connect/tree/v0.0.9) (2017-03-01)

* Add optional "status" element to the object passed to error-handlers. See https://github.com/folio-org/stripes-connect/blob/master/doc/api.md#error-handling for details. Fixes STRIPES-224.

## 0.0.8 (2017-02-24)

* First version to have a documented change-log. Each subsequent version will describe its differences from the previous one.
