import { useRef } from 'react';

// A hook used to run a given callback
// when component initializes before the first render
const useComponentWillMount = callback => {
  const willMount = useRef(true);

  if (willMount.current) {
    callback();
  }

  willMount.current = false;
};


export default useComponentWillMount;
