# The Stripes Connect module

Copyright (C) 2017 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

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

The API and data manifest are explained in detail in
[The Stripes Connect API](doc/api.md).
A complete worked example of a connected component for editing patrons
is explained in
[A component example: the **PatronEdit** component](../stripes-core/doc/component-example.md).
