import { useRef, useEffect } from 'react';

// A hook which holds a previous value.
// Useful to hold props from a previous render.
const usePrevious = value => {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  });

  // intentionally read during render: the effect above updates the ref
  // after render, so this yields the value from the previous render.
  // oxlint-disable-next-line react/refs
  return ref.current;
};

export default usePrevious;
