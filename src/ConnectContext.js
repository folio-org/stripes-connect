import React from 'react';

const ConnectContext = React.createContext();

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export function withConnect(WrappedComponent) {
  class WithConnect extends React.Component {
    render() {
      return (
        <ConnectContext.Consumer>
          {root => <WrappedComponent {...this.props} root={root} /> }
        </ConnectContext.Consumer>
      );
    }
  }
  WithConnect.displayName = `WithConnect(${getDisplayName(WrappedComponent)})`;
  return WithConnect;
}

export default ConnectContext;
