# Stripes-Connect Migration Paths
## 5.4 to 5.5
Upcoming release.

### A new way to request result list pages by offset is available
You can now request an individual result list page using an offset, rather than by increasing the `resultCount` which re-requests all previously fetched pages. In order to opt-in to this new workflow, the following props need to be passed in: 

You also need to add the following property to `manifest` to any routes component that is used for searching in your module: `resultOffset: '%{resultOffset}'`. For example, in ui-inventory the resulting `manifest` in ItemsRoute.js looks like this:

```
static manifest = Object.freeze({
    records: {
      ...
      resultOffset: '%{resultOffset}',
      perRequest: 100,
      path: 'inventory/instances',
      ...
```

Also, note that `resultOffset` needs to be initialized with a default value where the module defines the base `manifest` as follows: `resultOffset: { initialValue: 0 }`. For example, in ui-inventory the base `manifest` in withData.js looks like this:

```
static manifest = Object.freeze(
    Object.assign({}, WrappedComponent.manifest, {
      ...
      resultCount: { initialValue: INITIAL_RESULT_COUNT },
      resultOffset: { initialValue: 0 },
      ...
```