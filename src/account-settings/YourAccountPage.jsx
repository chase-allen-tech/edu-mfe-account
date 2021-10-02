import { AppContext } from '@edx/frontend-platform/react';
import { getConfig, history, getQueryParameters } from '@edx/frontend-platform';
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import memoize from 'memoize-one';
import findIndex from 'lodash.findindex';
import { sendTrackingLogEvent } from '@edx/frontend-platform/analytics';
import {
  injectIntl,
  intlShape,
  FormattedMessage,
  getCountryList,
  getLanguageList,
} from '@edx/frontend-platform/i18n';
import { Hyperlink, StatefulButton } from '@edx/paragon';

import messages from './AccountSettingsPage.messages';
import { fetchSettings, saveSettings, saveMultipleSettings, updateDraft } from './data/actions';
import { accountSettingsPageSelector } from './data/selectors';
import PageLoading from './PageLoading';
import Alert from './Alert';
import JumpNav from './JumpNav';
import DeleteAccount from './delete-account';
import EditableField from './EditableField';
import ResetPassword from './reset-password';
import ThirdPartyAuth from './third-party-auth';
import BetaLanguageBanner from './BetaLanguageBanner';
import EmailField from './EmailField';
import {
  YEAR_OF_BIRTH_OPTIONS,
  EDUCATION_LEVELS,
  GENDER_OPTIONS,
  COUNTRY_WITH_STATES,
  getStatesList,
} from './data/constants';
import { fetchSiteLanguages } from './site-language';
import CoachingToggle from './coaching/CoachingToggle';
import DemographicsSection from './demographics/DemographicsSection';
import imgUpload from '../assets/image_upload.png';

class YourAccountPage extends React.Component {
  constructor(props, context) {
    super(props, context);

    // If there is a "duplicate_provider" query parameter, that's the backend's
    // way of telling us that the provider account the user tried to link is already linked
    // to another user account on the platform. We use this to display a message to that effect,
    // and remove the parameter from the URL.
    const duplicateTpaProvider = getQueryParameters().duplicate_provider;
    if (duplicateTpaProvider !== undefined) {
      history.replace(history.location.pathname);
    }
    this.state = {
      duplicateTpaProvider,
    };

    this.sticky = React.createRef();

    this.navLinkRefs = {
      '#basic-information': React.createRef(),
      '#profile-information': React.createRef(),
      '#demographics-information': React.createRef(),
      '#social-media': React.createRef(),
      '#site-preferences': React.createRef(),
      '#linked-accounts': React.createRef(),
      '#delete-account': React.createRef(),
    };
  }

  componentDidMount() {
    this.props.fetchSettings();
    this.props.fetchSiteLanguages();
    sendTrackingLogEvent('edx.user.settings.viewed', {
      page: 'account',
      visibility: null,
      user_id: this.context.authenticatedUser.userId,
    });

    window.addEventListener("scroll", this.scrollFunction)
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.scrollFunction);
  }

  scrollFunction = () => {
    if (this.sticky.current.offsetTop > 50) {
      document.getElementById('sticky').style.visibility = 'hidden';
      document.getElementById('sticky-show').style.opacity = 0.8;
      document.getElementById('sticky-text').style.fontSize = '15px';
      document.getElementById('sticky-show').style.top = '0px';
    } else {
      document.getElementById('sticky').style.visibility = 'visible';
      document.getElementById('sticky-show').style.opacity = 0;
      document.getElementById('sticky-text').style.fontSize = '22px';
      document.getElementById('sticky-show').style.top = '-60px';
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.loading && !prevProps.loaded && this.props.loaded) {
      const locationHash = global.location.hash;
      // Check for the locationHash in the URL and then scroll to it if it is in the
      // NavLinks list
      if (typeof locationHash !== 'string') {
        return;
      }
      if (Object.keys(this.navLinkRefs).includes(locationHash) && this.navLinkRefs[locationHash].current) {
        window.scrollTo(0, this.navLinkRefs[locationHash].current.offsetTop);
      }
    }
  }

  // NOTE: We need 'locale' for the memoization in getLocalizedTimeZoneOptions.  Don't remove it!
  // eslint-disable-next-line no-unused-vars
  getLocalizedTimeZoneOptions = memoize((timeZoneOptions, countryTimeZoneOptions, locale) => {
    const concatTimeZoneOptions = [{
      label: this.props.intl.formatMessage(messages['account.settings.field.time.zone.default']),
      value: '',
    }];
    if (countryTimeZoneOptions.length) {
      concatTimeZoneOptions.push({
        label: this.props.intl.formatMessage(messages['account.settings.field.time.zone.country']),
        group: countryTimeZoneOptions,
      });
    }
    concatTimeZoneOptions.push({
      label: this.props.intl.formatMessage(messages['account.settings.field.time.zone.all']),
      group: timeZoneOptions,
    });
    return concatTimeZoneOptions;
  });

  getLocalizedOptions = memoize((locale, country) => ({
    countryOptions: [{
      value: '',
      label: this.props.intl.formatMessage(messages['account.settings.field.country.options.empty']),
    }].concat(getCountryList(locale).map(({ code, name }) => ({ value: code, label: name }))),
    stateOptions: [{
      value: '',
      label: this.props.intl.formatMessage(messages['account.settings.field.state.options.empty']),
    }].concat(getStatesList(country)),
    languageProficiencyOptions: [{
      value: '',
      label: this.props.intl.formatMessage(messages['account.settings.field.language_proficiencies.options.empty']),
    }].concat(getLanguageList(locale).map(({ code, name }) => ({ value: code, label: name }))),
    yearOfBirthOptions: [{
      value: '',
      label: this.props.intl.formatMessage(messages['account.settings.field.year_of_birth.options.empty']),
    }].concat(YEAR_OF_BIRTH_OPTIONS),
    educationLevelOptions: EDUCATION_LEVELS.map(key => ({
      value: key,
      label: this.props.intl.formatMessage(messages[`account.settings.field.education.levels.${key || 'empty'}`]),
    })),
    genderOptions: GENDER_OPTIONS.map(key => ({
      value: key,
      label: this.props.intl.formatMessage(messages[`account.settings.field.gender.options.${key || 'empty'}`]),
    })),
  }));

  handleEditableFieldChange = (name, value) => {
    this.props.updateDraft(name, value);
  };

  handleSubmit = (formId, values) => {
    console.log('[saving]', formId, values, this.props);
    this.props.saveSettings(formId, values);
  };

  handleSubmitForMultiple = () => {
    console.log('[mul]', this.props.formValues);
    const availList = ['name', 'year_of_birth', 'country', 'state', 'level_of_education', 'language_proficiencies', 'social_link_linkedin', 'social_link_facebook', 'social_link_twitter',
      'siteLanguage', 'time_zone'];
    let settingsArray = [];
    for (let key of Object.keys(this.props.formValues)) {
      if (availList.indexOf(key) >= 0) {
        settingsArray.push({
          formId: key, commitValues: this.props.formValues[key]
        })
      }
    }
    this.props.saveMultipleSettings(settingsArray, 'name');
  }

  isEditable(fieldName) {
    return !this.props.staticFields.includes(fieldName);
  }

  isManagedProfile() {
    // Enterprise customer profiles are managed by their organizations. We determine whether
    // a profile is managed or not by the presence of the profileDataManager prop.
    return Boolean(this.props.profileDataManager);
  }

  renderDuplicateTpaProviderMessage() {
    if (!this.state.duplicateTpaProvider) {
      return null;
    }

    return (
      <div>
        <Alert className="alert alert-danger" role="alert">
          <FormattedMessage
            id="account.settings.message.duplicate.tpa.provider"
            defaultMessage="The {provider} account you selected is already linked to another {siteName} account."
            description="alert message informing the user that the third-party account they attempted to link is already linked to another account"
            values={{
              provider: <b>{this.state.duplicateTpaProvider}</b>,
              siteName: getConfig().SITE_NAME,
            }}
          />
        </Alert>
      </div>
    );
  }

  renderManagedProfileMessage() {
    if (!this.isManagedProfile()) {
      return null;
    }

    return (
      <div>
        <Alert className="alert alert-primary" role="alert">
          <FormattedMessage
            id="account.settings.message.managed.settings"
            defaultMessage="Your profile settings are managed by {managerTitle}. Contact your administrator or {support} for help."
            description="alert message informing the user their account data is managed by a third party"
            values={{
              managerTitle: <b>{this.props.profileDataManager}</b>,
              support: (
                <Hyperlink destination={getConfig().SUPPORT_URL} target="_blank">
                  <FormattedMessage
                    id="account.settings.message.managed.settings.support"
                    defaultMessage="support"
                    description="website support"
                  />
                </Hyperlink>
              ),
            }}
          />
        </Alert>
      </div>
    );
  }

  renderEmptyStaticFieldMessage() {
    if (this.isManagedProfile()) {
      return this.props.intl.formatMessage(messages['account.settings.static.field.empty'], {
        enterprise: this.props.profileDataManager,
      });
    }
    return this.props.intl.formatMessage(messages['account.settings.static.field.empty.no.admin']);
  }

  renderSecondaryEmailField(editableFieldProps) {
    if (!this.props.formValues.secondary_email_enabled) {
      return null;
    }

    return (
      <EmailField
        name="secondary_email"
        label={this.props.intl.formatMessage(messages['account.settings.field.secondary.email'])}
        emptyLabel={this.props.intl.formatMessage(messages['account.settings.field.secondary.email.empty'])}
        value={this.props.formValues.secondary_email}
        confirmationMessageDefinition={messages['account.settings.field.secondary.email.confirmation']}
        {...editableFieldProps}
      />
    );
  }

  renderDemographicsSection() {
    // check the result of an LMS API call to determine if we should render the DemographicsSection component
    if (this.props.formValues.shouldDisplayDemographicsSection) {
      return (
        <DemographicsSection forwardRef={this.navLinkRefs['#demographics-information']} />
      );
    }
    return null;
  }

  onChangeLanguage = (e) => {
  }

  onOptionChange = (e) => {
  }

  renderContent() {
    const editableFieldProps = {
      onChange: this.handleEditableFieldChange,
      onSubmit: this.handleSubmit,
    };

    // Memoized options lists
    const {
      countryOptions,
      stateOptions,
      languageProficiencyOptions,
      yearOfBirthOptions,
      educationLevelOptions,
      genderOptions,
    } = this.getLocalizedOptions(this.context.locale, this.props.formValues.country);

    // Show State field only if the country is US (could include Canada later)
    const showState = this.props.formValues.country === COUNTRY_WITH_STATES;

    const timeZoneOptions = this.getLocalizedTimeZoneOptions(
      this.props.timeZoneOptions,
      this.props.countryTimeZoneOptions,
      this.context.locale,
    );

    const hasLinkedTPA = findIndex(this.props.tpaProviders, provider => provider.connected) >= 0;


    const options = {
      notification1: false,
      notification2: false,
      notification3: true,
      email1: false,
      email2: true,
      email3: false,
      phone1: true
    }



    return (
      <>
        <div className="tab-content" id="myTabContent">
          
          {/* *********************** Part2 *************************** */}
          <div className="p-4 mb-5 bg-white shadow-main">
            <h2 className="heading mt-2 fsp-24 lh-38 fw-bold text-a mbp-30">Your account</h2>
            <div className="mbp-30">
              <EmailField
                name="email"
                label={this.props.intl.formatMessage(messages['account.settings.field.email'])}
                emptyLabel={
                  this.isEditable('email')
                    ? this.props.intl.formatMessage(messages['account.settings.field.email.empty'])
                    : this.renderEmptyStaticFieldMessage()
                }
                value={this.props.formValues.email}
                confirmationMessageDefinition={messages['account.settings.field.email.confirmation']}
                helpText={this.props.intl.formatMessage(
                  messages['account.settings.field.email.help.text'],
                  { siteName: getConfig().SITE_NAME },
                )}
                isEditable={this.isEditable('email')}
                {...editableFieldProps}
              />
            </div>
            <div className="mbp-30">
              <label className="text-b fsp-11 fw-500 lh-16 mb-3">TELEPHONE<span className="text-danger">*</span></label>
              <input type="text" className="form-control" />
            </div>
            <div className="mb-3">
              <label className="text-b fsp-11 fw-500 lh-16 mb-3">CONFIRM NEW PASSWORD</label>
              <ResetPassword email={this.props.formValues.email} />
            </div>
          </div>
        </div>

      </>
    );
  }

  renderError() {
    return (
      <div>
        {this.props.intl.formatMessage(messages['account.settings.loading.error'], {
          error: this.props.loadingError,
        })}
      </div>
    );
  }

  renderLoading() {
    return (
      <PageLoading srMessage={this.props.intl.formatMessage(messages['account.settings.loading.message'])} />
    );
  }

  render() {
    const {
      loading,
      loaded,
      loadingError,
      saveState
    } = this.props;

    console.log('[saveState]', saveState);

    return (
      <>
        <div id="sticky-show" className="position-fixed w-100 bg-white trans-2 border-bottom sticky-container" style={{ zIndex: 1000 }}>
          <div className="w-100 d-flex justify-content-between shadow-main-main sticky-content">
            <div className="d-flex align-items-center h-100 msp-76">
              <div id="sticky-text" className="fsp-28 fw-600 lh-20 text-a trans-2">{this.props.intl.formatMessage(messages['account.settings.section.your.profile'])}</div>
            </div>
            <div className="profile d-flex">
              <div className="d-flex align-items-center cursor-pointer px-1 ms-2 mep-76">
                <StatefulButton type="submit" className="fsp-18 fw-bold p-btn bg-main2 rounded border border-1 hover-border text-muted hover-light-gray" state={saveState}
                  labels={{ default: this.props.intl.formatMessage(messages['account.settings.editable.field.action.save']), }}
                  onClick={(e) => { if (saveState !== 'pending') { this.handleSubmitForMultiple() } }}
                  disabledStates={[]}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="page__account-settings container" style={{ paddingTop: 10, paddingBottom: 100 }}>
          {this.renderDuplicateTpaProviderMessage()}
          <div>
            <div className="row">
              <div className="col-md-2">
                <JumpNav
                  displayDemographicsLink={this.props.formValues.shouldDisplayDemographicsSection ? true : false }
                />
              </div>
              <div className="col-md-10" style={{ paddingTop: 50 }}>

                <div id="sticky" className="sticky-top mbp-30" ref={this.sticky}>
                  <div className="w-100 d-flex justify-content-between hp-60">
                    <div className="d-flex align-items-center">
                      <h2 className="heading fsp-28 lh-38 fw-bold text-a">{this.props.intl.formatMessage(messages['account.settings.section.your.profile'])}</h2>
                    </div>
                    <div className="profile d-flex">
                      <div className="d-flex align-items-center cursor-pointer px-1 ms-2">
                        <StatefulButton type="submit" className="fsp-18 fw-bold p-btn bg-main2 rounded border border-1 hover-border text-muted hover-light-gray" state={saveState}
                          labels={{ default: this.props.intl.formatMessage(messages['account.settings.editable.field.action.save']), }}
                          onClick={(e) => { if (saveState !== 'pending') { this.handleSubmitForMultiple() } }}
                          disabledStates={[]}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {loading ? this.renderLoading() : null}
                {loaded ? this.renderContent() : null}
                {loadingError ? this.renderError() : null}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

YourAccountPage.contextType = AppContext;

YourAccountPage.propTypes = {
  intl: intlShape.isRequired,
  loading: PropTypes.bool,
  loaded: PropTypes.bool,
  loadingError: PropTypes.string,
  saveState: PropTypes.oneOf(['default', 'pending', 'complete', 'error']),

  // Form data
  formValues: PropTypes.shape({
    username: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    secondary_email: PropTypes.string,
    secondary_email_enabled: PropTypes.string,
    year_of_birth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    country: PropTypes.string,
    level_of_education: PropTypes.string,
    gender: PropTypes.string,
    language_proficiencies: PropTypes.string,
    phone_number: PropTypes.string,
    social_link_linkedin: PropTypes.string,
    social_link_facebook: PropTypes.string,
    social_link_twitter: PropTypes.string,
    time_zone: PropTypes.string,
    coaching: PropTypes.shape({
      coaching_consent: PropTypes.bool.isRequired,
      user: PropTypes.number.isRequired,
      eligible_for_coaching: PropTypes.bool.isRequired,
    }),
    state: PropTypes.string,
    shouldDisplayDemographicsSection: PropTypes.bool,
  }).isRequired,
  siteLanguage: PropTypes.shape({
    previousValue: PropTypes.string,
    draft: PropTypes.string,
  }),
  siteLanguageOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })),
  profileDataManager: PropTypes.string,
  staticFields: PropTypes.arrayOf(PropTypes.string),
  isActive: PropTypes.bool,
  secondary_email_enabled: PropTypes.bool,

  timeZoneOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })),
  countryTimeZoneOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })),
  fetchSiteLanguages: PropTypes.func.isRequired,
  updateDraft: PropTypes.func.isRequired,
  saveSettings: PropTypes.func.isRequired,
  fetchSettings: PropTypes.func.isRequired,
  tpaProviders: PropTypes.arrayOf(PropTypes.object),
};

YourAccountPage.defaultProps = {
  loading: false,
  loaded: false,
  loadingError: null,
  saveState: null,
  siteLanguage: null,
  siteLanguageOptions: [],
  timeZoneOptions: [],
  countryTimeZoneOptions: [],
  profileDataManager: null,
  staticFields: [],
  tpaProviders: [],
  isActive: true,
  secondary_email_enabled: false,
};

export default connect(accountSettingsPageSelector, {
  fetchSettings,
  saveSettings,
  saveMultipleSettings,
  updateDraft,
  fetchSiteLanguages,
})(injectIntl(YourAccountPage));
