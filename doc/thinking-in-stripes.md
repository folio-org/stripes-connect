# Thinking in Stripes

Index Data, 2017.

<!-- ../../okapi/doc/md2toc -l 2 thinking-in-stripes.md -->
* [Introduction](#introduction)
* [Overview](#overview)
* [Underlying technology](#underlying-technology)
* [Principles of stripes-connect](#principles-of-stripes-connect)
    * [Declarative, immutable data manifest](#declarative-immutable-data-manifest)
    * [Modifying local state](#modifying-local-state)
    * [Firing actions](#firing-actions)
* [Appendix: escaping to redux](#appendix-escaping-to-redux)


## Introduction

[The Stripes toolkit](https://github.com/folio-org/stripes-core) aims to make it as easy as possible to write UI modules that commuicate with RESTful Web services. Most importantly, it is the toolkit used to write UI modules for [the FOLIO library services platform](https://www.folio.org/).

This document aims to bring new UI module developers developers up to speed with the concepts behind Stripes (especially stripes-connect), so that they are have a context in which to understand [The Stripes Connect API](api.md)  reference guide.


## Overview

Stripes consists of several separate JavaScript libraries that work together. The good news is that you don't need to think about most of them in order to create Stripes-based UI modules. They are:

* **stripes-connect** -- provides the connection to FOLIO's services.
* **stripes-components** -- provides re-usable UI components such as checkboxes, search forms and multi-pane layouts.
* **stripes-loader** -- low-level machinery that pulls a set of Stripes Modules into a web application
* **stripes-core** -- a web application that controls a set of UI modules and helps them to work together.

In general, Stripes Core is configured by a list of UI modules to include, and it uses stripes-loader to pull them all into a bundle of HTML/CSS/JS resources. Each of those modules composes UI elements from stripes-components (and other sources as needed) to search, view, edit and manage data maintained by the FOLIO web-services.

As a module author, you need to know JavaScript, be familiar with UI components (including those available from stripes-components) and understand how to connect to FOLIO web-services.


## Underlying technology

Stripes UI modules are written in **JavaScript** -- specifically, in [EcmaScript 6 (ES6)](http://es6-features.org/), a modern version of JavaScript that fixes many of the problems that made earlier version of the language difficult to work with.

The Stripes UI is built using [**React**](https://facebook.github.io/react/), a library that provides an elegant component-based approach that can provide a very responsive user experience. The promise of React is that it "will efficiently update and render just the right components when your data changes." And that is also the goal of stripes-connect.

React works best when used with [**JSX**](https://jsx.github.io/), a simple syntax for embedding XML (including HTML) into JavaScript. You don't need to use JSX,  but it's easy to learn and very expressive.

So you should consider ES6, React and JSX the prerequisites for writing Stripes UI components.

(Under the hood, stripes-connect uses [Redux](https://github.com/reactjs/redux) to manage its state. But UI module authors do not need to use Redux directly.)


## Principles of stripes-connect

When programming with stripes-connect, you do not directly interact with the back-end web-services. There is no sending of requests or handling of responses -- the stripes-connect library deals with all that. Instead, UI modules do two things:

1. They make a declarative statement of what back-end information they are interested, in the form of a _manifest_. The manifest provides information about a number of `resources`, each of which corresponds to data available from the back-end. Most importantly, each resource's `path` specifies how various parts of state -- URL path components and query parameters, local state such as form values, etc. -- is composed into a web-service URL used to access the back-end web-service.

2. They modify local state -- mostly through the use of _mutators_ -- to reflect users' actions, such as searching, sorting, selecing and editing records.

That is all. The stripes-connect library issues the necessary requests, handles the responses, and updates the component's properties; and React then ensures that components whose contents have changed are re-rendered.

### Declarative, immutable data manifest

A manifest is provided by each connection component class in a UI module. It is a class-level static constant. For example:

	static manifest = Object.freeze({
	  user: {
	    type: 'okapi',
	    path: 'users/:{userid}',
	  },
	});

(This manifest declares a single resource, called `user`, which is connected to an Okapi service at a path that depends on the `userid` part of the path in the UI's URL.)

The manifest is constant, immutable, and identical across all instances of a class -- something that is conventionally indicated in code by freezing the object with `Object.freeze()`. It can best be thought of constituting a set of instructions for transforming local state into remote operations.

### Modifying local state

The manifest is immutable, and shared between all instances of a component. By contrast, each instance of a component has its own local state, and may change it at any time.

State is of several kinds:

* React state, which may be modified at any time using React's standard `setState()` method. This is typically how components keep track of UI elements such as query textboxes and filtering checkboxes -- see the React documentation on [Forms and Controlled Components](https://facebook.github.io/react/docs/forms.html).

* The present URL of the UI application, which typically carries state in both its path and its query: for example, the URL `/users/123?query=smith&sort=username` contains a user-ID `123` in its path, and a query `smith` and sort-specification `username` in query parameters `query` and `sort` respectively.

  (At present, the URL is changed using the standard React Router method, `this.context.router.transitionTo(newUrl)`. In future, this will probably done instead using mutators -- concerning which, see below.)

Stripes-connect detects changes to the state, and issues whatever requests are necessary to obtain relevant data. For example, if the URL changes from `/users/123?query=smith&sort=username` to `/users/123?query=smith&sort=email`, it will issue a new search request with the sort-order modified accordingly.

### Firing actions

Every connected component is given, in its properties, a _mutator_, which is an object containing functions XXX


## Principles for designing Stripes UI modules

The Redux community leans towards fewer connected components where possible, as components that are purely functions of their props are easiest to debug, test and maintain. This is a good rule of thumb for stripes-connected components, too: aim for fewer connected components except where doing that means going more than a little bit out of the way and creating convoluted code.


## Appendix: escaping to redux

XXX


