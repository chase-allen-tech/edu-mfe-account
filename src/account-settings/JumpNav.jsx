import React from 'react';
import { injectIntl, intlShape } from '@edx/frontend-platform/i18n';
// import { NavLink } from 'react-router-hash-link';
import { NavLink } from "react-router-dom";
import Scrollspy from 'react-scrollspy';

import { getConfig } from '@edx/frontend-platform';
import PropTypes from 'prop-types';
import messages from './AccountSettingsPage.messages';

function JumpNav({ intl, displayDemographicsLink }) {
  return (
    <div className="jump-nav" style={{paddingTop: 50}}>
      <Scrollspy
        items={[
          '',
          'account',
          // 'demographics-information',
          'preference',
          'document',
          // 'linked-accounts',
          // 'delete-account',
        ]}
        className="list-unstyled"
        currentClassName="font-weight-bold"
      >
        <li className="fsp-12 text-b fw-500 lh-48 ls-1 text-uppercase mb-0">
          <NavLink to="/setting/" className="text-muted text-decoration-none hover-opacity trans-2" activeClassName="text-black">
            {intl.formatMessage(messages['account.settings.section.your.profile'])}
          </NavLink>
        </li>
        <li className="fsp-12 text-b fw-500 lh-48 ls-1 text-uppercase mb-0">
          <NavLink to="/setting/account" className="text-muted text-decoration-none hover-opacity trans-2" activeClassName="text-black">
            {intl.formatMessage(messages['account.settings.section.your.account'])}
          </NavLink>
        </li>
        {/* {getConfig().ENABLE_DEMOGRAPHICS_COLLECTION && displayDemographicsLink
          && (
          <li className="fsp-12 text-b fw-500 lh-48 ls-1 text-uppercase mb-0">
            <NavLink to="/demographics-information" className="text-muted text-decoration-none hover-opacity trans-2" activeClassName="text-black">
              {intl.formatMessage(messages['account.settings.section.demographics.information'])}
            </NavLink>
          </li>
          )} */}
        <li className="fsp-12 text-b fw-500 lh-48 ls-1 text-uppercase mb-0">
          <NavLink to="/setting/preference" className="text-muted text-decoration-none hover-opacity trans-2" activeClassName="text-black">
            {intl.formatMessage(messages['account.settings.section.your.preferences'])}
          </NavLink>
        </li>
        <li className="fsp-12 text-b fw-500 lh-48 ls-1 text-uppercase mb-0">
          <NavLink to="/setting/document" className="text-muted text-decoration-none hover-opacity trans-2" activeClassName="text-black">
            {intl.formatMessage(messages['account.settings.section.your.documents'])}
          </NavLink>
        </li>
        {/* <li className="fsp-12 text-b fw-500 lh-48 ls-1 text-uppercase mb-0">
          <NavLink to="/linked-accounts" className="text-muted text-decoration-none hover-opacity trans-2" activeClassName="text-black">
            {intl.formatMessage(messages['account.settings.section.linked.accounts'])}
          </NavLink>
        </li>
        <li className="fsp-12 text-b fw-500 lh-48 ls-1 text-uppercase mb-0">
          <NavLink to="/delete-account" className="text-muted text-decoration-none hover-opacity trans-2" activeClassName="text-black">
            {intl.formatMessage(messages['account.settings.jump.nav.delete.account'])}
          </NavLink>
        </li> */}
      </Scrollspy>
    </div>
  );
}

JumpNav.propTypes = {
  intl: intlShape.isRequired,
  displayDemographicsLink: PropTypes.bool,
};

export default injectIntl(JumpNav);
