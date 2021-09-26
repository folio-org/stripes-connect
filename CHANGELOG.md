# Change history for stripes-connect

## 7.0.0 (IN PROGRESS)

* React 17. STCON-119.
* Upgrade RxJS to v6. Refs STRIPES-723.
* Use current eslint-parser, eslint, fetch-mock, jsdom, uuid. Refs STCON-130.

## [6.2.0](https://github.com/folio-org/stripes-connect/tree/v6.2.0) (2021-06-08)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v6.1.0...v6.2.0)

* Added the ability for elements of a manifest 'headers' property to be interpreted, and also to be a function in addition to an object. Refs STCON-121
* Provide tenant's locale in `Accept-Language` HTTP header of `OkapiResource` requests. Refs STCON-127.
* Introduce `resultDensity` option for pagination component. Refs STCON-123.

## [6.1.0](https://github.com/folio-org/stripes-connect/tree/v6.1.0) (2021-02-25)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v6.0.0...v6.1.0)

* Added additional check to not trigger a fetch when params is null, refs STCON-115
* Perform substitutions on perRequest option, refs STCON-117

## [6.0.0](https://github.com/folio-org/stripes-connect/tree/v6.0.0) (2020-10-06)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.6.1...v6.0.0)

* Init resources correctly so their state is immediately available for inspection.
* Add ability to cancel pending requests. Revs STCON-104.
* Remove unnecessary use of isomorphic-fetch
* Allow mutators to configure `throwErrors` option. STCON-112.

## [5.6.1](https://github.com/folio-org/stripes-connect/tree/v5.6.1) (2020-06-08)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.6.0...v5.6.1)

* Use `UNSAFE_componentWillReceiveProps` for a quieter console. Refs STCON-70.

## [5.6.0](https://github.com/folio-org/stripes-connect/tree/v5.6.0) (2020-05-19)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.5.0...v5.6.0)

This lets us better scope the shouldRefresh for our resources.

* Better `shouldRefresh` scoping on resources allows, e.g. to avoid it after `DELETE` requests.
* Added `originatingActionType` to `REFRESH` action `meta` objects.
* Improved documentation for error handling and local resource mutation.
* Throw when `connect` receives an undefined component because, duh, that ain't right.
* Restart paging correctly. STCON-102.

## [5.5.0](https://github.com/folio-org/stripes-connect/tree/v5.5.0) (2020-03-03)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.4.4...v5.5.0)

* Reset paging with a successful fetch. Resolves UIU-1405.
* Added support for fetching result list pages individually by offset. See migration path [documentation](MIGRATIONPATHS.md). Refs STCON-57.
* PUT mutator returns the server's response when it is JSON rather than the client record. Refs STCON-92.
* Introduce `silent` option to POST, PUT and DELETE mutators. Refs UIU-1295.
* Improve documentation of error-handling. Refs STCON-99.

## [5.4.4](https://github.com/folio-org/stripes-connect/tree/v5.4.4) (2019-12-11)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.4.3...v5.4.4)

* Elegantly handle unexpected changes to `totalRecords` during pagination. Refs STCON-90, STSMACOM-259.

## [5.4.3](https://github.com/folio-org/stripes-connect/tree/v5.4.3) (2019-12-04)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.4.2...v5.4.3)

* On unmount, reset resources having `resourceShouldRefresh`. Refs UICIRC-365.

## [5.4.2](https://github.com/folio-org/stripes-connect/tree/v5.4.2) (2019-10-15)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.4.1...v5.4.2)

* Add ability to clear registered epics. Part of STRIPES-659.
* Validate presence of `opts` before accessing it to avoid NPE. STCON-87.
* RESTResource: shouldRefresh when `fetch` goes true. STCON-88.

## [5.4.1](https://github.com/folio-org/stripes-connect/tree/v5.4.1) (2019-10-08)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.4.0...v5.4.1)

* Added cache to registering `mutationEpics` whenever components are re-connected to reduce subscriptions and correct performance issues that occur when submitting forms. Refs UIIN-687.

## [5.4.0](https://github.com/folio-org/stripes-connect/tree/v5.4.0) (2019-09-09)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.3.0...v5.4.0)

* Add `PRUNE` redux action to allow resetting of stored records. Refs UIIN-687.

## [5.3.0](https://github.com/folio-org/stripes-connect/tree/v5.3.0) (2019-07-22)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.2.1...v5.3.0)

* The `records` parameter of a REST-resource manifest may now be multi-level as in `'records.value'`.
* Pass `props` to `path` and `params` functions as a fifth parameter.
* Refresh resource with interpolated property when the prop changes. Fixes STCON-81.
* Refresh resource when query params change.
* Performance improvements following from STCON-81, including FOLIO-2158 and STCON-85.

## [5.2.1](https://github.com/folio-org/stripes-connect/tree/v5.2.1) (2019-06-07)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.2.0...v5.2.1)

* prevent crash when `RESTResource.verbOptions` returns null.

## [5.2.0](https://github.com/folio-org/stripes-connect/tree/v5.2.0) (2019-05-10)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.1.0...v5.2.0)

* Run substitution on the `clientGeneratePk` manifest option, allowing it to be set from (for example) a prop.
* Allow `fetch` manifest option to be a callback. STCON-78.
* When `path` is not a static string use its post-processed value when deciding to sync. Refs STCON-48, STCON-49, STCON-80.

## [5.1.0](https://github.com/folio-org/stripes-connect/tree/v5.1.0) (2019-04-25)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v5.0.0...v5.1.0)

* Turned off sideEffects to enable tree-shaking for production builds. Refs STRIPES-564 and STRIPES-581.

## [5.0.0](https://github.com/folio-org/stripes-connect/tree/v5.0.0) (2019-03-14)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v4.1.0...v5.0.0)

* Provide ConnectContext internally to eliminate dependency on stripes-core/circular dependency. Fixes STCON-76.

## [4.1.0](https://github.com/folio-org/stripes-connect/tree/v4.1.0) (2019-03-14)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v4.0.1...v4.1.0)

* New version of stripes-core (3.1.0). Refs STRIPES-608.

## [4.0.1](https://github.com/folio-org/stripes-connect/tree/v4.0.1) (2019-03-13)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v4.0.0...v4.0.1)

* Make the stripes-core dependency more strict with ~ instead of ^.

## [4.0.0](https://github.com/folio-org/stripes-connect/tree/v4.0.0) (2019-01-16)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v3.4.1...v4.0.0)

* New version of `stripes-core`

## [3.4.1](https://github.com/folio-org/stripes-connect/tree/v3.4.0) (2019-01-16)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v3.4.0...v3.4.1)

* Revert `stripes-core` `v3.0.0` dependency change

## [3.4.0](https://github.com/folio-org/stripes-connect/tree/v3.4.0) (2019-01-15)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v3.3.1...v3.4.0)

* Use `stripes-core` `v3.0.0` when available

## [3.3.1](https://github.com/folio-org/stripes-connect/tree/v3.3.1) (2018-11-06)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v3.3.0...v3.3.1)

* Upgrade linting and dependencies
* Unsubscribe from store on unmount

## [3.3.0](https://github.com/folio-org/stripes-connect/tree/v3.3.0) (2018-10-02)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v3.2.0...v3.3.0)

* Add `shouldRefresh` function to a manifest's object. Part of STCON-71.

## [3.2.0](https://github.com/folio-org/stripes-connect/tree/v3.2.0) (2018-09-05)
[Full Changelog](https://github.com/folio-org/stripes-connect/compare/v3.1.0...v3.2.0)

* `verbOptions` returns null if any of the templated values are incomplete. Fixes STCON-58.
* Failed fetches on a resource clear existing data from that resource. Fixes STCON-64. Available from v3.1.1.
* Added ability to specify `throwErrors` boolean in resource manifests. Setting to `false` turns off global error reporting for that resource. Fixes STCON-67. Available from v3.1.2.
* Allow LocalResource to be initalized with a non-object falsey value. Fixes STCON-65. Available from v3.1.3.
* Updating `connect` documentation to describe the curried `connect` function and the `dataKey` prop. Fixes STCON-61.
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
