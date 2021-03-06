import {inject, observer} from 'mobx-react';
import * as React from 'react';
import {Link, RouteComponentProps} from 'react-router-dom';
import {RootStoreProps} from '../../App';
import {Banner} from '../../components/Banner';
import {TfaDisabledBanner} from '../../components/Banner/TfaDisabledBanner';
import {asAssetBalance} from '../../components/hoc/assetBalance';
import {NumberFormat} from '../../components/NumberFormat/index';
import TransferForm from '../../components/TransferForm/index';
import TransferQrWindow from '../../components/TransferQrWindow';
import {AnalyticsEvent} from '../../constants/analyticsEvents';

import {
  ROUTE_SECURITY,
  ROUTE_TRANSFER_FAIL,
  ROUTE_TRANSFER_SUCCESS
} from '../../constants/routes';
import {STORE_ROOT} from '../../constants/stores';
import {OpStatus, TransferModel} from '../../models';
import './style.css';

interface TransferPageProps extends RootStoreProps, RouteComponentProps<any> {}

const DEFAULT_ACCURACY = 2;

export class TransferPage extends React.Component<TransferPageProps> {
  readonly walletStore = this.props.rootStore!.walletStore;
  readonly transferStore = this.props.rootStore!.transferStore;
  readonly uiStore = this.props.rootStore!.uiStore;
  readonly assetStore = this.props.rootStore!.assetStore;
  readonly profileStore = this.props.rootStore!.profileStore;
  readonly analyticsService = this.props.rootStore!.analyticsService;

  componentDidMount() {
    const {walletId, assetId, dest} = this.props.match.params;
    const wallet = this.walletStore.findWalletById(walletId);
    const asset = assetId && this.assetStore.getById(assetId);

    if (
      !this.transferStore.newTransfer[dest] ||
      !this.transferStore.newTransfer[dest].id
    ) {
      if (!!wallet) {
        this.transferStore.newTransfer.setWallet(wallet, dest);
      } else {
        ['from', 'to'].forEach((x: 'from' | 'to') =>
          this.transferStore.newTransfer.setWallet(
            this.walletStore.createWallet(),
            x
          )
        );
      }
    }

    if (!!asset && !this.transferStore.newTransfer.asset) {
      this.transferStore.newTransfer.setAsset(asset);
    }

    window.scrollTo(0, 0);
  }

  render() {
    const {newTransfer} = this.transferStore;
    return (
      <div className="container">
        <div className="transfer">
          <TfaDisabledBanner show={this.profileStore.is2faForbidden} />
          <Banner
            show={!this.profileStore.is2faEnabled}
            className="tfa-banner"
            title="Two-Factor Authentication"
            text={
              <span>
                To ensure the security of transfers from Lykke, you need to turn
                on Two-Factor Authentication. Find out more about it{' '}
                <Link to={ROUTE_SECURITY} onClick={this.trackStart2faSetup}>
                  here
                </Link>.
              </span>
            }
          />

          <h1>Transfer</h1>
          <h2>
            {!!newTransfer.asset &&
              !!newTransfer.from.id && (
                <span>
                  {asAssetBalance(
                    newTransfer.asset,
                    newTransfer.from.balances.find(
                      b => b.assetId === newTransfer.asset.id
                    )!.availableBalance
                  )}{' '}
                  {newTransfer.asset.name}
                </span>
              )}
            {!!newTransfer.asset || (
              <NumberFormat value={0} accuracy={DEFAULT_ACCURACY} />
            )}
          </h2>
          <p className="transfer__text">
            To transfer any asset to other wallet please fill in the form.
          </p>
          <TransferForm onTransfer={this.handleTransfer} />
          <div className="transfer__text transfer__text--center">
            If you have any other problem contact{' '}
            <a className="link" href="mailto:support@lykke.com">
              our support
            </a>
          </div>
          <TransferQrWindow />
        </div>
      </div>
    );
  }

  private trackStart2faSetup = () => {
    this.analyticsService.track(AnalyticsEvent.Start2faSetup);
  };

  private readonly handleTransfer = async (transfer: TransferModel) => {
    let k = 0;
    const timeout = 1000;
    const poll = () => {
      if (this.transferStore.newTransfer.amount === 0) {
        return;
      }
      k = k + 1;
      const operationIsTooLong = k > 120;
      setTimeout(async () => {
        const op = await this.transferStore.fetchOperationDetails(transfer);
        const {amount, asset} = transfer;
        switch (op.Status) {
          case OpStatus.Confirmed:
          case OpStatus.Completed:
            this.uiStore.closeQrWindow();
            this.transferStore.finishTransfer(transfer);
            await this.walletStore.fetchWallets();
            this.props.history.replace(ROUTE_TRANSFER_SUCCESS, {
              amount,
              assetId: asset.id
            });
            break;
          case OpStatus.Canceled:
            if (this.transferStore.newTransfer.amount > 0) {
              this.resetAndFail('was canceled', false);
            }
            break;
          case OpStatus.Failed:
            this.resetAndFail('failed', false);
            break;
          default:
            if (operationIsTooLong) {
              this.resetAndFail('failed');
            } else {
              poll();
            }
            break;
        }
      }, timeout);
    };
    poll();
  };

  private resetAndFail = (reason: string, shouldCancel: boolean = true) => {
    if (shouldCancel) {
      this.transferStore.newTransfer.cancel();
    }
    this.transferStore.resetCurrentTransfer();
    this.uiStore.closeQrWindow();
    this.props.history.replace(ROUTE_TRANSFER_FAIL, {
      reason
    });
  };
}

export default inject(STORE_ROOT)(observer(TransferPage));
