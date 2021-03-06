import {action, observable, runInAction} from 'mobx';
import {RootStore} from '.';
import {DepositApi} from '../api/depositApi';
import {ApiResponse} from '../api/types';
import {
  DepositCreditCardModel,
  DepositSwiftModel,
  GatewayUrls
} from '../models/index';

interface TransactionDetailResponse {
  AssetId: string;
  Amount: number;
}

export class DepositStore {
  @observable defaultDeposit: DepositCreditCardModel;
  @observable newDeposit: DepositCreditCardModel;
  @observable swiftRequisites: DepositSwiftModel;
  @observable swiftRequisitesLoading: boolean = false;
  @observable gatewayUrls: GatewayUrls;
  @observable feePercentage: number = 0;
  @observable submitDeposit: () => void;
  @observable showMaxDepositErrorDialog: boolean = false;
  @observable fetchBankCardPaymentUrlError: any;
  @observable transactionDetails: TransactionDetailResponse;
  @observable transactionDetailsLoading: boolean = false;

  constructor(readonly rootStore: RootStore, private api?: DepositApi) {
    this.defaultDeposit = new DepositCreditCardModel();
    this.newDeposit = new DepositCreditCardModel();
    this.gatewayUrls = new GatewayUrls();
  }

  @action
  resetCurrentDeposit = () => {
    this.newDeposit.update(this.defaultDeposit);
    this.gatewayUrls = new GatewayUrls();
  };

  @action
  setGatewayUrls = (gatewayUrls: GatewayUrls) => {
    this.gatewayUrls = gatewayUrls;
  };

  @action
  setShowMaxDepositErrorDialog = (value: boolean) => {
    this.showMaxDepositErrorDialog = value;
  };

  fetchBankCardPaymentUrl = async (deposit: DepositCreditCardModel) => {
    let response: ApiResponse<any>;

    try {
      response = await this.api!.fetchBankCardPaymentUrl(deposit);
    } catch (err) {
      if (err.message) {
        this.fetchBankCardPaymentUrlError = JSON.parse(err.message);
        throw JSON.parse(err.message);
      }
      throw {
        message: 'Something went wrong. Please check form or try again later.'
      };
    }

    return {
      cancelUrl: response.CancelUrl,
      failUrl: response.FailUrl,
      okUrl: response.OkUrl,
      paymentUrl: response.Url
    };
  };

  fetchDepositDefaultValues = async () => {
    const response = await this.api!.fetchDepositDefaultValues();

    if (response) {
      this.defaultDeposit = new DepositCreditCardModel({
        amount: 0
      });
      this.resetCurrentDeposit();
    }
  };

  fetchSwiftRequisites = async (assetId: string) => {
    this.swiftRequisites = new DepositSwiftModel();
    this.swiftRequisitesLoading = true;
    try {
      const response = await this.api!.fetchSwiftRequisites(assetId);
      if (response) {
        this.swiftRequisites = new DepositSwiftModel({
          accountName: response.AccountName || '',
          accountNumber: response.AccountNumber || '',
          bankAddress: response.BankAddress || '',
          bic: response.Bic || '',
          companyAddress: response.CompanyAddress || '',
          correspondentAccount: response.CorrespondentAccount || '',
          purposeOfPayment: response.PurposeOfPayment || ''
        });
      }
      // tslint:disable-next-line
    } catch (e) {}

    this.swiftRequisitesLoading = false;
  };

  sendSwiftRequisites = async (assetId: string, amount: number) => {
    await this.api!.sendSwiftRequisites(assetId, amount);
  };

  fetchFee = async () => {
    const response = await this.api!.fetchFee();

    if (response) {
      runInAction(() => {
        this.feePercentage = response.Amount;
      });
    }
  };

  fetchTransactionDetails = async (transactionId: string) => {
    this.transactionDetailsLoading = true;
    const response = await this.api!.fetchTransactionDetails(transactionId);
    this.transactionDetailsLoading = false;
    if (response) {
      runInAction(() => {
        this.transactionDetails = response;
      });
    }
  };
}

export default DepositStore;
