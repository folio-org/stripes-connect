# The Stripes Connect module

Copyright (C) 2016-2026 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## Deprecation

This module is deprecated. As of 2026, API queries should use [react-query](https://tanstack.com/query/latest). For example:
```
import { useQuery } from 'react-query';
import { useNamespace, useOkapiKy } from '@folio/stripes/core';

const useSomeQuery = () => {
  const ky = useOkapiKy();
  const [namespace] = useNamespace({ key: 'some-unique-key' });

  const { data, isLoading, isError } = useQuery(
    [namespace],
    () => ky.get('/some/resource').json(),
  );

  return { data, isLoading, isError };
};
```

## Introduction

Stripes Connect provides essentially one service: the ability to
upgrade a regular React component into a Connected Component. This is
done by importing the `connect()` method from `stripes-connect`,
defining a data manifest, and exporting not the React component itself
but the result of wrapping it in a call to `connect()`:

```
import { Component } from 'react';
import { connect } from 'stripes-connect';
class MyStripesComponent extends Component {
  static manifest = { 'resourceName': { params: values } };
  // ...
}
export default connect(MyStripesComponent, 'moduleName');
```

## Documentation

* The API and data manifest are explained in detail in
[The Stripes Connect API](doc/api.md).
* A complete worked example of a connected component for editing patrons
is explained in
[A component example: the **PatronEdit** component](https://github.com/folio-org/stripes-core/blob/master/doc/component-example.md).
* New features and migration paths for modules to opt-in to them are explained in [Migration Paths](MIGRATIONPATHS.md)

## Additional information

See [stripes-core](https://github.com/folio-org/stripes-core).

See project [STCON](https://issues.folio.org/browse/STCON)
at the [FOLIO issue tracker](https://folio-org.atlassian.net/jira/).

Other FOLIO Developer documentation is at [dev.folio.org](https://dev.folio.org/)
