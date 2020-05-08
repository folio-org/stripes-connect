import { useContext } from 'react';

import StripesContext from '../ConnectContext';

const useOkapi = () => {
  const { store } = useContext(StripesContext);
  const { okapi } = store.getState();
  const { url, tenant, token } = okapi;
  const okapiOptions = {
    root: url,
    headers: {
      'X-Okapi-Tenant': tenant,
    },
  };

  if (token) {
    okapiOptions.headers['X-Okapi-Token'] = token;
  }

  return () => okapiOptions;
};

export default useOkapi;
