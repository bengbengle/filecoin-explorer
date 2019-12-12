import React, { Component } from 'react';
import FlipMove from 'react-flip-move';
import ErrorModal from '../error/error-modal';
import Spinner from '../loading/spinner';
import Generation from './generation';
import arrowDown from './arrow-down.svg';

const convertChainStateToArray = chainState =>
  Object.keys(chainState)
    .sort((a, b) => b - a)
    .map(height => chainState[height]);

class Chain extends Component {
  constructor(props) {
    super(props);
    this.state = {
      chain: false,
      paginating: false,
      page: 1,
      hasError: false,
      numUpdatesFromChain: 0,
    };
  }

  pause = ms => {
    return new Promise(resolve => (this.pauseHandle = setTimeout(resolve, ms)));
  };

  storeSubscriptionCallback = chainState => {
    this.setState({
      chain: convertChainStateToArray(chainState),
      // we count the number of chain updates so we dont show any blank screens
      numUpdatesFromChain: this.state.numUpdatesFromChain + 1,
      paginating: false,
    });
  };

  componentDidMount() {
    const arrayChain = convertChainStateToArray(this.props.chainApi.getChain());
    this.setState({
      chain: arrayChain,
      numUpdatesFromChain: arrayChain.length,
    });
    // subscribe to new chain events
    this.props.chainApi.subscribe(this.storeSubscriptionCallback);
    // get collect a few blocks starting at head - 1
    this.props.chainApi.fetchChain();
    // poll lotus for new chain updates and update the observable store
    this.props.chainApi.listen();
  }

  componentWillUnmount() {
    if (this.pauseHandle) {
      window.clearTimeout(this.pauseHandle);
    }
    // unsubscribe from the chainstore and stop listening for new events to avoid mem leaks
    this.props.chainApi.unsubscribe(this.storeSubscriptionCallback);
    this.props.chainApi.stopListening();
  }

  render() {
    const { chain, hasError, numUpdatesFromChain, paginating } = this.state;
    const clearError = () => this.setState({ hasError: false });

    // wait until 3 chain updates come in before marking "loading" as complete
    const loading = numUpdatesFromChain < 3;

    if (hasError) {
      return (
        <ErrorModal subject="Something went wrong" onClose={clearError}>
          Chain could not be loaded.
        </ErrorModal>
      );
    }

    if (!loading && !chain) {
      return <h2>No Chain (something probably went wrong)</h2>;
    }

    if (!loading && chain.length === 0) {
      return this.props.reverse ? (
        <h3>No Newer Blocks</h3>
      ) : (
        <h3>No Older Blocks</h3>
      );
    }

    if (loading) {
      return (
        <>
          <h3>Chain is loading...</h3>
          <p>Blocks will be streamed starting from the Chain Head</p>
        </>
      );
    }

    return (
      <div>
        <FlipMove enterAnimation="fade" leaveAnimation="fade">
          {chain
            ? chain
                .filter(gen => gen.length > 0)
                .map((gen, i) => <Generation blocks={gen} key={i} />)
            : null}
          {!paginating && numUpdatesFromChain > 5 && this.state.page < 5 &&
            <div
              style={{
                cursor: 'pointer',
                marginTop: '10px',
                width: '30px',
                height: '30px',
              }}
              className="db bottom-0 ph2 pv1 charcoal bg-snow br1 f6 link focus-outline"
              title="Older"
              role="button"
              onClick={() => {
                this.setState({paginating: true, page: this.state.page + 1})
                this.props.chainApi.loadNextBlocks()
              }}
            >
              <img src={arrowDown} alt="" className="dib v-mid" />
            </div>
          }
          {paginating &&
            <div style={{ height: '60px' }}>
              <Spinner loading style={{ top: '20px', left: '31px', position: 'relative', height: '20px' }} />
            </div>
          }
        </FlipMove>
        <Spinner loading={loading} style={{ top: '26px', left: '31px' }} />
      </div>
    );
  }
}

export default Chain;
