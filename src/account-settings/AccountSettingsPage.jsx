import { AppContext } from '@edx/frontend-platform/react';
import { getConfig, history, getQueryParameters } from '@edx/frontend-platform';
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import memoize from 'memoize-one';
import { NavHashLink } from 'react-router-hash-link';
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
import { Redirect, Route, Switch } from 'react-router-dom';

import Scrollspy from 'react-scrollspy';

class AccountSettingsPage extends React.Component {
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
      '#general-information': React.createRef(),
      '#your-business': React.createRef(),
      '#social-networks': React.createRef(),
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
    if (!this.sticky) return;
    if (!this.sticky.current) return;
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
      'siteLanguage', 'time_zone', 'phone_number', 'bio'];
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

  renderContentProfile() {

    console.log('[lang]', this.props.siteLanguageOptions);
    const {
      saveState
    } = this.props;

    const editableFieldProps = {
      onChange: this.handleEditableFieldChange,
      onSubmit: this.handleSubmit,
    };

    // Memoized options lists
    const {
      countryOptions,
      stateOptions,
      yearOfBirthOptions,
      genderOptions,
    } = this.getLocalizedOptions(this.context.locale, this.props.formValues.country);

    // Show State field only if the country is US (could include Canada later)
    const showState = this.props.formValues.country === COUNTRY_WITH_STATES;

    return (
      <>
        <div id="sticky-show" className="position-fixed w-100 bg-white trans-2 border-bottom sticky-container" style={{ zIndex: 1000, left: 0 }}>
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

        <div className="mbp-30"></div>

        <div className="dashboard-tab">
          <Scrollspy
            items={[
              '',
              'your-business',
              'social-networks',
            ]}
            className="list-unstyled nav"
            id="remote-manager-nav"
            currentClassName="font-weight-bold"
          >
            <li className="nav-item">
              <div onClick={e => this.onScrollToView("#general-information")} className="remote-tab-item color-subtitle d-block remote-tab-active fsp-11 fw-500 lh-24 text-uppercase ls-1 pt-0 px-0 text-decoration-none cursor-pointer"
                aria-current="page">{this.props.intl.formatMessage(messages['account.settings.section.general.information'])}</div>
            </li>
            <li className="nav-item">
              <div onClick={e => this.onScrollToView("#your-business")} className="remote-tab-item color-subtitle d-block fsp-11 fw-500 lh-24 text-uppercase ls-1 pt-0 px-0 text-decoration-none cursor-pointer"
              >{this.props.intl.formatMessage(messages['account.settings.section.your.business'])}</div>
            </li>
            <li className="nav-item">
              <div onClick={e => this.onScrollToView("#social-networks")} className="remote-tab-item color-subtitle d-block fsp-11 fw-500 lh-24 text-uppercase ls-1 pt-0 px-0 text-decoration-none cursor-pointer"
              >{this.props.intl.formatMessage(messages['account.settings.section.social.networks'])}</div>
            </li>
          </Scrollspy>
        </div>
        <div className="tab-content" id="myTabContent">
          <div className="tab-pane fade show active" id="general-information" ref={this.navLinkRefs['#general-information']} role="tabpanel" aria-labelledby="home-tab">
            <h2 className="heading mt-5 fsp-24 lh-38 fw-bold text-a mbp-30">{this.props.intl.formatMessage(messages['account.settings.section.general.information'])}</h2>

            <div className="p-4 bg-white shadow-main">
              <div className="mbp-30">
                <EditableField
                  name="username"
                  type="text"
                  value={this.props.formValues.username}
                  label={this.props.intl.formatMessage(messages['account.settings.field.username'])}
                  helpText={this.props.intl.formatMessage(
                    messages['account.settings.field.username.help.text'],
                    { siteName: getConfig().SITE_NAME },
                  )}
                  isEditable={false}
                  {...editableFieldProps}
                />
              </div>
              <div className="mbp-30">
                <EditableField
                  name="name"
                  type="text"
                  value={this.props.formValues.name}
                  label={this.props.intl.formatMessage(messages['account.settings.field.full.name'])}
                  emptyLabel={
                    this.isEditable('name')
                      ? this.props.intl.formatMessage(messages['account.settings.field.full.name.empty'])
                      : this.renderEmptyStaticFieldMessage()
                  }
                  helpText={this.props.intl.formatMessage(messages['account.settings.field.full.name.help.text'])}
                  isEditable={this.isEditable('name')}
                  {...editableFieldProps}
                />
              </div>
              <div className="mbp-30">
                <div className="d-flex flex-column justify-content-center align-items-center pp-14 profile-content">
                  <div className="d-flex align-items-center mb-3 pt-3">
                    <img src={imgUpload} className="mx-auto d-block size-38" alt="" />
                    <div className="fsp-16 fw-bold color-subtitle ms-2">{this.props.intl.formatMessage(messages['account.settings.field.upload.image'])}</div>
                  </div>
                  <div className="fsp-14 color-pagination">{this.props.intl.formatMessage(messages['account.settings.field.upload.accept.format'])}</div>
                </div>
              </div>
              <div className="mbp-30">
                <EditableField
                  name="bio"
                  type="text"
                  value={this.props.formValues.bio}
                  label={this.props.intl.formatMessage(messages['account.settings.field.biography'])}
                  emptyLabel={
                    this.isEditable('bio')
                      ? this.props.intl.formatMessage(messages['account.settings.field.full.name.empty'])
                      : this.renderEmptyStaticFieldMessage()
                  }
                  helpText={this.props.intl.formatMessage(messages['account.settings.field.full.name.help.text'])}
                  isEditable={this.isEditable('bio')}
                  {...editableFieldProps}
                />
              </div>
              <div className="mbp-30">
                <EditableField
                  name="phone_number"
                  type="text"
                  value={this.props.formValues.phone_number}
                  label={this.props.intl.formatMessage(messages['account.settings.field.telephone'])}
                  emptyLabel={
                    this.isEditable('phone_number')
                      ? this.props.intl.formatMessage(messages['account.settings.field.full.name.empty'])
                      : this.renderEmptyStaticFieldMessage()
                  }
                  helpText={this.props.intl.formatMessage(messages['account.settings.field.full.name.help.text'])}
                  isEditable={this.isEditable('phone_number')}
                  {...editableFieldProps}
                />
              </div>
              <div className="mbp-30">
                <EditableField
                  name="year_of_birth"
                  type="select"
                  className="form-select"
                  label={this.props.intl.formatMessage(messages['account.settings.field.dob'])}
                  emptyLabel={this.props.intl.formatMessage(messages['account.settings.field.dob.empty'])}
                  value={this.props.formValues.year_of_birth}
                  options={yearOfBirthOptions}
                  {...editableFieldProps}
                />
              </div>
              <div className="mbp-30">
                <EditableField
                  name="gender"
                  type="select"
                  className="form-select"
                  value={this.props.formValues.gender}
                  options={genderOptions}
                  label={this.props.intl.formatMessage(messages['account.settings.field.gender'])}
                  emptyLabel={this.props.intl.formatMessage(messages['account.settings.field.gender.empty'])}
                  {...editableFieldProps}
                />
              </div>
            </div>
          </div>

          <div className="" id="your-business" role="tabpanel" aria-labelledby="profile-tab" ref={this.navLinkRefs['#your-business']}>
            <h2 className="heading fsp-24 lh-38 fw-bold text-a mbp-30" style={{ paddingTop: 60 }}>{this.props.intl.formatMessage(messages['account.settings.section.your.business'])}</h2>
            <div className="p-4 bg-white shadow-main">

              <div className="mbp-30">
                <EditableField
                  name="country"
                  type="select"
                  className="form-select"
                  value={this.props.formValues.country}
                  options={countryOptions}
                  label={this.props.intl.formatMessage(messages['account.settings.field.country'])}
                  emptyLabel={
                    this.isEditable('country')
                      ? this.props.intl.formatMessage(messages['account.settings.field.country.empty'])
                      : this.renderEmptyStaticFieldMessage()
                  }
                  isEditable={this.isEditable('country')}
                  {...editableFieldProps}
                />
                {showState
                  && (
                    <EditableField
                      name="state"
                      type="select"
                      className="form-select"
                      value={this.props.formValues.state}
                      options={stateOptions}
                      label={this.props.intl.formatMessage(messages['account.settings.field.state'])}
                      emptyLabel={
                        this.isEditable('state')
                          ? this.props.intl.formatMessage(messages['account.settings.field.state.empty'])
                          : this.renderEmptyStaticFieldMessage()
                      }
                      isEditable={this.isEditable('state')}
                      {...editableFieldProps}
                    />
                  )}
              </div>
            </div>
          </div>
          <div className="" id="social-networks" role="tabpanel" aria-labelledby="contact-tab" ref={this.navLinkRefs['#social-networks']}>
            <h2 className="heading fsp-24 lh-38 fw-bold text-a mbp-30" style={{ paddingTop: 60 }}>{this.props.intl.formatMessage(messages['account.settings.section.social.networks'])}</h2>
            <div className="p-4 bg-white shadow-main mb-5">
              <div className="mbp-30">
                <EditableField
                  name="social_link_linkedin"
                  type="text"
                  value={this.props.formValues.social_link_linkedin}
                  label={this.props.intl.formatMessage(messages['account.settings.field.social.platform.name.linkedin'])}
                  emptyLabel={this.props.intl.formatMessage(messages['account.settings.field.social.platform.name.linkedin.empty'])}
                  {...editableFieldProps}
                />
              </div>
              <div className="mbp-30">
                <EditableField
                  name="social_link_facebook"
                  type="text"
                  value={this.props.formValues.social_link_facebook}
                  label={this.props.intl.formatMessage(messages['account.settings.field.social.platform.name.facebook'])}
                  emptyLabel={this.props.intl.formatMessage(messages['account.settings.field.social.platform.name.facebook.empty'])}
                  {...editableFieldProps}
                />
              </div>
              <div className="mbp-30">
                <EditableField
                  name="social_link_twitter"
                  type="text"
                  value={this.props.formValues.social_link_twitter}
                  label={this.props.intl.formatMessage(messages['account.settings.field.social.platform.name.twitter'])}
                  emptyLabel={this.props.intl.formatMessage(messages['account.settings.field.social.platform.name.twitter.empty'])}
                  {...editableFieldProps}
                />
              </div>
            </div>
          </div>

        </div>

      </>
    );
  }

  renderYourAccount() {

    const {
      saveState
    } = this.props;

    const editableFieldProps = {
      onChange: this.handleEditableFieldChange,
      onSubmit: this.handleSubmit,
    };

    return (
      <>
        <div id="sticky-show" className="position-fixed w-100 bg-white trans-2 border-bottom sticky-container" style={{ zIndex: 1000, left: 0 }}>
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
        <div className="tab-content" id="myTabContent">

          {/* *********************** Part2 *************************** */}
          <div className="p-4 mb-5 bg-white shadow-main">
            <h2 className="heading mt-2 fsp-24 lh-38 fw-bold text-a mbp-30">{this.props.intl.formatMessage(messages['account.settings.section.your.account'])}</h2>
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
              <label className="text-b fsp-11 fw-500 lh-16 mb-3">{this.props.intl.formatMessage(messages['account.settings.field.telephone'])}<span className="text-danger">*</span></label>
              <input type="text" className="form-control" />
            </div>
            <div className="mb-3">
              <ResetPassword email={this.props.formValues.email} />
            </div>
          </div>
        </div>

      </>
    );
  }

  renderDocument() {
    return (
      <>
        <div className="tab-content" id="myTabContent">
          <div>
            <h2 class="heading mt-2 fsp-28 lh-32 fw-bold text-a mbp-30">{this.props.intl.formatMessage(messages['account.settings.section.your.document'])}</h2>
            <h5 class="fsp-24 lh-38 fw-bold">{this.props.intl.formatMessage(messages['account.settings.section.remote.manager'])}</h5>
            <p class="text-b fsp-14 lh-16 color-profile-a pb-2">{this.props.intl.formatMessage(messages['account.settings.section.remote.manager.desc'])}</p>
            <div class="bg-main-card p-2 px-4 fsp-14 lh-20 color-profile-a shadow-sm">
              {this.props.intl.formatMessage(messages['account.settings.field.remote.manager.comment'])}
            </div>

            <div class="mt-4 shadow-sm bg-main-card">
              <div class="d-flex justify-content-between px-4 py-3 color-profile-a">
                <div class="fsp-14 lh-20">{this.props.intl.formatMessage(messages['account.settings.field.document'])}</div>
                <div class="ms-auto fsp-14">{this.props.intl.formatMessage(messages['account.settings.field.action'])}</div>
              </div>
              <div class="d-flex justify-content-between px-4 py-3 color-profile-a">
                <div class="fsp-16 lh-22 fw-normal">{this.props.intl.formatMessage(messages['account.settings.field.training.certificate'])}</div>
                <div class="ms-auto cursor-pointer"><i class="bi bi-download fsp-16 fw-bold"></i></div>
              </div>
            </div>
          </div>
        </div>

      </>
    );
  }

  renderPreference() {

    // const editableFieldProps = {
    //   onChange: this.handleEditableFieldChange,
    //   onSubmit: this.handleSubmit,
    // };
    const currentLanguage = this.props.siteLanguage.draft !== undefined ? this.props.siteLanguage.draft : this.context.locale;
    console.log('[curr]', currentLanguage);

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
          {/* ********************** Part 3 ************************ */}
          <div className="tab-pane fade show active" id="general-information" role="tabpanel" aria-labelledby="home-tab">
            <h2 className="heading mt-2 fsp-24 lh-38 fw-bold text-a mbp-30">{this.props.intl.formatMessage(messages['account.settings.section.your.preferences'])}</h2>
            <h2 className="heading mt-5 fsp-24 lh-38 fw-bold text-a mbp-30">{this.props.intl.formatMessage(messages['account.settings.section.notification'])}</h2>

            <div className="p-4 my-4 shadow-main bg-white">
              <div className="row mb-2">
                <div className="col-lg-10">
                  <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.field.respond.comment'])}</div>
                </div>
                <div className="col-lg-2">
                  <div className="form-check form-switch position-relative">
                    <input className="form-check-input" type="checkbox" id="flexSwitchCheckChecked" name="notification1" checked={options.notification1} onChange={this.onOptionChange} />
                    <label className="form-check-label ml-1" for="flexSwitchCheckChecked">
                      {options.notification1 ? "Yes" : "No"}
                    </label>
                  </div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-lg-10">
                  <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.field.respond.comment'])}</div>
                </div>
                <div className="col-lg-2">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="flexSwitchCheckChecked" name="notification2" checked={options.notification2} onChange={this.onOptionChange} />

                    <label className="form-check-label ml-1" for="flexSwitchCheckChecked">
                      {options.notification2 ? "Yes" : "No"}
                    </label>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-10">
                  <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.field.new.comment'])}</div>
                </div>
                <div className="col-lg-2">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="flexSwitchCheckDefault" name="notification3" checked={options.notification3} onChange={this.onOptionChange} />

                    <label className="form-check-label ml-1" for="flexSwitchCheckDefault">
                      {options.notification3 ? "Yes" : "No"}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="heading mt-5 fsp-24 lh-38 fw-bold text-a mbp-30">{this.props.intl.formatMessage(messages['account.settings.section.email.notification'])}</h2>
            <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.section.email.notification.desc'])}</div>

            <div className="p-4 my-4 shadow-main bg-white">
              <div className="row mb-2">
                <div className="col-lg-10">
                  <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.field.email.announcement'])}</div>
                </div>
                <div className="col-lg-2">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="flexSwitchCheckChecked" name="email1" checked={options.email1} onChange={this.onOptionChange} />

                    <label className="form-check-label ml-1" for="flexSwitchCheckChecked">
                      {options.email1 ? "Yes" : "No"}
                    </label>
                  </div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-lg-10">
                  <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.field.email.reminders'])}</div>
                </div>
                <div className="col-lg-2">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="flexSwitchCheckChecked" name="email2" checked={options.email2} onChange={this.onOptionChange} />

                    <label className="form-check-label ml-1" for="flexSwitchCheckChecked">
                      {options.email2 ? "Yes" : "No"}
                    </label>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-10">
                  <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.field.email.response'])}</div>
                </div>
                <div className="col-lg-2">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="flexSwitchCheckDefault" name="email3" checked={options.email3} onChange={this.onOptionChange} />

                    <label className="form-check-label ml-1" for="flexSwitchCheckDefault">
                      {options.email3 ? "Yes" : "No"}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="heading mt-5 fsp-24 lh-38 fw-bold text-a mbp-30">Phone</h2>
            <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.section.phone.desc'])}</div>

            <div className="p-4 my-4 shadow-main bg-white">
              <div className="row">
                <div className="col-lg-10">
                  <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.field.phone.announcement'])}</div>
                </div>
                <div className="col-lg-2">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="flexSwitchCheckChecked" name="phone1" checked={options.phone1} onChange={this.onOptionChange} />

                    <label className="form-check-label ml-1" for="flexSwitchCheckChecked">
                      {options.phone1 ? "Yes" : "No"}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="heading mt-5 fsp-24 lh-38 fw-bold text-a mbp-30">{this.props.intl.formatMessage(messages['account.settings.field.language'])}</h2>
            <div className="fsp-16 fw-normal lh-25">{this.props.intl.formatMessage(messages['account.settings.section.language.desc'])}</div>

            <div className="p-4 my-4 shadow-main bg-white">
              <div className="row">
                <div className="col-lg-10">
                  <div className="fsp-11 fw-500 lh-26 pb-3 text-uppercase">{this.props.intl.formatMessage(messages['account.settings.field.language'])}</div>
                  <div className="d-flex" onChange={e => this.handleSubmit('siteLanguage', e.target.value)}>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="flexRadioDefault" value="en" id="flexSwitchCheckChecked1" checked={currentLanguage === 'en'}/>
                      <label className="form-check-label" for="flexSwitchCheckChecked1">{this.props.intl.formatMessage(messages['account.settings.field.english'])}</label>
                    </div>
                    <div className="form-check ml-3">
                      <input className="form-check-input" type="radio" name="flexRadioDefault" value="fr" id="flexSwitchCheckChecked2" checked={currentLanguage === 'fr'} />
                      <label className="form-check-label" for="flexSwitchCheckChecked2">{this.props.intl.formatMessage(messages['account.settings.field.french'])}</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </>
    );
  }

  renderContent() {
    return (
      <>
        <Route exact path="/setting/" render={this.renderContentProfile.bind(this)} />
        <Route exact path="/setting/account" render={this.renderYourAccount.bind(this)} />
        <Route exact path="/setting/preference" render={this.renderPreference.bind(this)} />
        <Route exact path="/setting/document" render={this.renderDocument.bind(this)} />
      </>
    )
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

  onScrollToView(hash) {
    if (Object.keys(this.navLinkRefs).includes(hash) && this.navLinkRefs[hash].current) {
      // window.scrollTo(0, this.navLinkRefs[hash].current.offsetTop);
      window.scrollTo({ top: this.navLinkRefs[hash].current.offsetTop + 60, behavior: 'smooth' });
    }
  }

  render() {
    const {
      loading,
      loaded,
      loadingError,
      saveState
    } = this.props;

    return (
      <>

        <div className="page__account-settings container" style={{ paddingTop: 10, paddingBottom: 100 }}>
          {this.renderDuplicateTpaProviderMessage()}
          <div>
            <div className="row">
              <div className="col-md-2">
                <JumpNav
                  displayDemographicsLink={this.props.formValues.shouldDisplayDemographicsSection ? true : false}
                />
              </div>
              <div className="col-md-10" style={{ paddingTop: 50 }}>



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

AccountSettingsPage.contextType = AppContext;

AccountSettingsPage.propTypes = {
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
    shouldDisplayDemographicsSection: PropTypes.string,
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

AccountSettingsPage.defaultProps = {
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
})(injectIntl(AccountSettingsPage));
