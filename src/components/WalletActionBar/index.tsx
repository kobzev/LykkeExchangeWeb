import {
  Dropdown,
  DropdownContainer,
  DropdownControl,
  DropdownList,
  DropdownListItem,
  DropdownPosition
} from '@lykkex/react-components';
import * as classNames from 'classnames';
import {inject, observer} from 'mobx-react';
import * as React from 'react';
import * as CopyToClipboard from 'react-copy-to-clipboard';
import {Link} from 'react-router-dom';
import {RootStoreProps} from '../../App';
import {
  ROUTE_DEPOSIT_CREDIT_CARD_TO,
  ROUTE_DEPOSIT_CRYPTO_TO,
  ROUTE_DEPOSIT_SWIFT_TO,
  ROUTE_HISTORY,
  ROUTE_TRANSFER_FROM
} from '../../constants/routes';
import {STORE_ROOT} from '../../constants/stores';
import {AssetModel, WalletModel} from '../../models';
import './style.css';

interface WalletActionBarProps extends RootStoreProps {
  wallet: WalletModel;
}

export class WalletActionBar extends React.Component<WalletActionBarProps> {
  state = {message: ''};

  render() {
    const {wallet, rootStore} = this.props;
    const assetsAvailableForCreditCardDeposit = rootStore!.assetStore
      .assetsAvailableForCreditCardDeposit;
    const assetsAvailableForSwiftDeposit = rootStore!.assetStore
      .assetsAvailableForSwiftDeposit;
    const assetsAvailableForCryptoDeposit = rootStore!.assetStore
      .assetsAvailableForCryptoDeposit;
    const isKycPassed = rootStore!.profileStore.isKycPassed;

    return (
      <div className="wallet-action-bar">
        <div className="wallet-action-bar__item">
          {wallet.isTrading &&
            (isKycPassed ? (
              <Dropdown fullHeight>
                <DropdownControl>
                  <a>Deposit</a>
                </DropdownControl>
                <DropdownContainer>
                  <DropdownList className="wallet-menu">
                    {this.renderDepositMenuItem(
                      `${process.env
                        .PUBLIC_URL}/images/paymentMethods/deposit-credit-card.svg`,
                      'Credit Card',
                      assetsAvailableForCreditCardDeposit,
                      (assetId: string) =>
                        ROUTE_DEPOSIT_CREDIT_CARD_TO(wallet.id, assetId)
                    )}
                    {this.renderDepositMenuItem(
                      `${process.env
                        .PUBLIC_URL}/images/paymentMethods/deposit-bl-transfer-icn.svg`,
                      'Blockchain Transfer',
                      assetsAvailableForCryptoDeposit,
                      (assetId: string) => ROUTE_DEPOSIT_CRYPTO_TO(assetId)
                    )}
                    {this.renderDepositMenuItem(
                      `${process.env
                        .PUBLIC_URL}/images/paymentMethods/deposit-swift-icn.svg`,
                      'SWIFT',
                      assetsAvailableForSwiftDeposit,
                      (assetId: string) => ROUTE_DEPOSIT_SWIFT_TO(assetId)
                    )}
                  </DropdownList>
                </DropdownContainer>
              </Dropdown>
            ) : (
              <a className="disabled">Deposit</a>
            ))}
        </div>
        <div className="wallet-action-bar__item">
          <Link to={ROUTE_TRANSFER_FROM(wallet.id)}>Transfer</Link>
        </div>
        {wallet.isTrading && (
          <div className="wallet-action-bar__item">
            <Link to={ROUTE_HISTORY}>History</Link>
          </div>
        )}
        {wallet.apiKey && (
          <div
            className={classNames(
              'wallet-action-bar__item',
              'wallet-action-bar__item--key',
              'pull-right'
            )}
          >
            {!!this.state.message && (
              <small
                style={{
                  color: 'green',
                  fontWeight: 'normal',
                  paddingRight: '1em'
                }}
              >
                {this.state.message}
              </small>
            )}
            <CopyToClipboard
              text={this.props.wallet.apiKey}
              onCopy={this.handleCopyApiKey}
            >
              <a title="Click to copy your API Key">API Key</a>
            </CopyToClipboard>
          </div>
        )}
      </div>
    );
  }

  private renderDepositMenuItem = (
    iconUrl: string,
    title: string,
    assets: AssetModel[],
    getRoute: (assetId: string) => string
  ) => (
    <DropdownListItem>
      <Dropdown position={DropdownPosition.RIGHT}>
        <DropdownControl>
          <a>
            <img className="icon" src={iconUrl} />
            {title}
          </a>
        </DropdownControl>
        <DropdownContainer>
          <DropdownList className="wallet-asset-menu">
            {assets.map(asset => (
              <DropdownListItem key={asset.id}>
                <Link to={getRoute(asset.id)}>{asset.name}</Link>
              </DropdownListItem>
            ))}
          </DropdownList>
        </DropdownContainer>
      </Dropdown>
    </DropdownListItem>
  );

  private handleCopyApiKey = (text: string) => {
    if (!!text) {
      this.setState({message: 'Copied!'});
      setTimeout(() => {
        this.setState({message: ''});
      }, 2000);
    }
  };
}

export default inject(STORE_ROOT)(observer(WalletActionBar));
