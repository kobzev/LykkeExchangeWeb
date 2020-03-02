import {Amplitude, EventModel, GoogleAnalytics} from '@lykkex/lykke.js';
import {getHash} from '../utils';

class AnalyticsService {
  private googleAnalyticsId = process.env.REACT_APP_GOOGLE_ANALYTICS_ID;
  private amplitudeId = process.env.REACT_APP_AMPLITUDE_ID;

  init = () => {
    if (this.googleAnalyticsId) {
      GoogleAnalytics.setup(this.googleAnalyticsId);
    }
    if (this.amplitudeId) {
      Amplitude.setup(this.amplitudeId);

      if (process.env.REACT_APP_ENVIRONMENT !== 'production') {
        // tslint:disable-next-line
        console.log('Amplitude initialized');
      }
    }
  };

  pageview = (path: string) => {
    if (this.googleAnalyticsId) {
      GoogleAnalytics.pageview(path);
    }
  };

  track = (event: EventModel) => {
    if (this.amplitudeId) {
      Amplitude.track(event);

      if (process.env.REACT_APP_ENVIRONMENT !== 'production') {
        // tslint:disable-next-line
        console.log(event.title, event.details);
      }
    }
  };

  setUserId = (email: string) => {
    if (this.amplitudeId) {
      const hashedEmail = getHash(email, 'sha256');
      Amplitude.setUserId(hashedEmail);

      if (process.env.REACT_APP_ENVIRONMENT !== 'production') {
        // tslint:disable-next-line
        console.log('Amplitude.setUserId', email, hashedEmail);
      }
    }
  };

  identify = (traits: object) => {
    if (this.amplitudeId) {
      Amplitude.identify(traits);
    }
  };
}

export default new AnalyticsService();
