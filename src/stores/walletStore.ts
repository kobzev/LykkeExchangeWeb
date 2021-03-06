import {
  action,
  computed,
  extendObservable,
  observable,
  reaction,
  runInAction
} from 'mobx';
import {RootStore} from '.';
import {WalletApi} from '../api';
import {WalletModel, WalletType} from '../models';
import {sum} from '../utils/math';

export class WalletStore {
  @observable wallets: WalletModel[] = [];
  @observable selectedWallet: WalletModel;
  @observable walletsLoading: boolean = false;
  @observable walletsInitialized: boolean = false;
  @observable origName: string;
  @observable origDescription: string;
  @computed
  get totalBalance() {
    return this.wallets.map(w => w.totalBalance).reduce(sum, 0);
  }

  constructor(readonly rootStore: RootStore, private api?: WalletApi) {
    reaction(
      () =>
        this.walletsWithAssets.map(wallet => ({
          balances: wallet.balances.map(b => b.balance),
          wallet
        })),
      () => {
        this.convertBalances();
      }
    );
  }

  @computed
  get walletsWithAssets() {
    return this.wallets.filter(w => w.hasBalances);
  }

  @computed
  get apiWallets() {
    return this.wallets.filter(
      w => w.type === WalletType.Trusted && !!w.apiKey
    );
  }

  @computed
  get tradingWallets() {
    return this.wallets.filter(w => w.isTrading);
  }

  getWalletsExceptOne = (wallet: WalletModel) =>
    this.wallets.filter(w => w.id !== wallet.id);

  createWallet = (dto?: any) => new WalletModel(this, dto);

  @action
  addWallet = (wallet: WalletModel) => {
    const idx = this.findWalletById(wallet.id);
    if (!!idx) {
      throw new Error('Duplicate wallet');
    } else {
      this.wallets.unshift(wallet);
    }
  };

  createApiWallet = async (wallet: WalletModel) => {
    const {title, desc, apiv2Only} = wallet;
    const dto = await this.api!.createApiWallet(title, apiv2Only, desc);
    const newWallet = this.createWallet({
      ApiKey: dto.ApiKey,
      Apiv2Only: dto.Apiv2Only,
      Description: dto.Description,
      Id: dto.WalletId,
      Name: dto.Name
    });
    const result = this.createWallet({
      ApiKey: dto.ApiKey,
      Apiv2Only: dto.Apiv2Only,
      Description: dto.Description,
      Id: dto.WalletId,
      Name: dto.Name
    });
    this.addWallet(
      extendObservable(newWallet, {
        apiv2Only,
        desc,
        title,
        type: WalletType.Trusted
      })
    );
    return result;
  };

  findWalletById = (id: string) => this.wallets.find(w => w.id === id);

  clearWallets = () => (this.wallets = []);

  fetchWallets = async () => {
    const wallets = await this.api!.fetchAll();
    const balances = await this.rootStore.balanceStore.fetchAll();
    runInAction(() => {
      this.wallets = wallets.map(this.createWallet);
      this.wallets.forEach(w => {
        w.setBalances(balances.find((b: any) => b.Id === w.id).Balances);
      });
    });
  };

  fetchWalletById = async (id: string) => {
    const dto = await this.api!.fetchById(id);
    return this.createWallet(dto);
  };

  regenerateApiKey = async (wallet: WalletModel, code: string) => {
    const resp = await this.api!.regenerateApiKey(
      wallet.id,
      code,
      wallet.apiv2Only
    );
    runInAction(() => {
      if (resp.IsCodeValid) {
        wallet.apiKey = resp.Payload.ApiKey;
      }
    });

    return resp;
  };

  convertBalances = () => {
    const {baseAssetAsModel} = this.rootStore.profileStore;
    this.walletsWithAssets.forEach(async wallet => {
      runInAction(() => {
        wallet.balances.forEach(b => {
          b.balanceInBaseAsset = this.rootStore.marketService.convert(
            b.balance,
            b.assetId,
            baseAssetAsModel!.id,
            this.rootStore.assetStore.getInstrumentById
          );
        });
      });
    });
  };

  updateWallet = (wallet: WalletModel) => this.api!.updateWallet(wallet);

  fetchWalletsData = async () => {
    if (this.walletsInitialized) {
      return;
    }
    this.walletsLoading = true;
    const assetStore = this.rootStore!.assetStore;
    const marketService = this.rootStore!.marketService;

    await assetStore.fetchAssets();
    await this.fetchAssetsMetadata();
    await assetStore.fetchRates();

    marketService.init(assetStore.instruments, assetStore.assets);

    await this.fetchWallets();
    this.walletsInitialized = true;
    this.walletsLoading = false;
  };

  fetchAssetsMetadata = async () => {
    const assetStore = this.rootStore!.assetStore;
    return Promise.all([
      this.processRequest(assetStore.fetchAssetsAvailableForDeposit),
      this.processRequest(assetStore.fetchAssetsAvailableForWithdraw),
      this.processRequest(assetStore.fetchInstruments)
    ]);
  };

  private processRequest = (request: () => Promise<void>) => {
    return request();
  };
}

export default WalletStore;
