import React from 'react';

const MockRootContext = React.createContext();

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export function withMockRoot(WrappedComponent) {
  class WithMockRoot extends React.Component {
    render() {
      return (
        <MockRootContext.Consumer>
          {root => <WrappedComponent {...this.props} root={root} /> }
        </MockRootContext.Consumer>
      );
    }
  }
  WithMockRoot.displayName = `WithMockRoot(${getDisplayName(WrappedComponent)})`;
  return WithMockRoot;
}

export default MockRootContext;
