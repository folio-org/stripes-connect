import { forOwn } from 'lodash';
import { useEffect, useRef } from 'react';
import { combineReducers } from 'redux';
import { useThunkReducer } from 'react-hook-thunk-reducer';

import OkapiResource from '../OkapiResource';
import RESTResource from '../RESTResource';
import LocalResource from '../LocalResource';
import { initialResourceState } from '../RESTResource/reducer';
import useOkapi from './useOkapi';

const defaultType = 'local';
const types = {
  local: LocalResource,
  okapi: OkapiResource,
  rest: RESTResource,
};
const logger = { log: () => {} };

/**
 * @param manifest - an object representing manifest
 * @param props - optional props
 *
 * @return an array where first item represents resources
 * and second item represents mutators
 *
 * Example usage:

  const manifest = {
    patronGroups: {
      type: 'okapi',
      path: 'groups',
      records: 'usergroups',
    },
  };

  const Component = () => {
    const [resources, mutators] = useManifest(manifest);
  }
*/
const useManifest = (manifest, props) => {
  const okapiOptions = useOkapi();
  const resources = useRef();
  const mutators = useRef();
  const rootReducer = useRef();
  const initState = useRef({});

  // initialize resource instances
  if (!resources.current) {
    resources.current = {};
    const reducers = {};

    forOwn(manifest, (definition, name) => {
      const { type, dataKey } = definition;
      const Resource = types[type || defaultType];
      const resource = new Resource(name, { okapiOptions, ...definition }, '', logger, dataKey);
      resources.current[name] = resource;
      reducers[name] = resource.reducer;

      if (resource instanceof LocalResource) {
        initState.current[name] = resource?.query?.initialValue ?? {};
      } else {
        initState.current[name] = initialResourceState;
      }
    });

    rootReducer.current = combineReducers(reducers);
  }

  const [state, dispatch] = useThunkReducer(rootReducer.current, initState.current);

  // initialize mutators
  if (!mutators.current) {
    mutators.current = {};
    forOwn(resources.current, (resource, name) => {
      mutators.current[name] = resource.getMutator(dispatch);
    });
  }

  useEffect(() => {
    forOwn(resources.current, (resource) => {
      if (resource.refresh) {
        resource.refresh(dispatch, props ?? {});
      }
    });

    return () => {
      resources.current = null;
      mutators.current = null;
      rootReducer.current = null;
    };
  }, [props, dispatch]);

  return [
    state,
    mutators.current,
  ];
};

export default useManifest;
