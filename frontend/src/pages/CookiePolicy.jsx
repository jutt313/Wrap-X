import React from 'react';
import '../styles/LegalPages.css';

function CookiePolicy() {
  return (
    <div className="legal-page-container">
      <div className="legal-page-content">
        <div className="legal-page-header">
          <div className="legal-logo-container">
            <img src="/logo-full.png" alt="Wrap-X" className="legal-logo" />
          </div>
          <h1>Cookie Policy</h1>
          <p className="legal-page-subtitle">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            This Cookie Policy explains how Wrap-X ("we", "us", "our", or "Company") uses cookies and similar tracking technologies on our website and Service. This policy should be read in conjunction with our Privacy Policy and Terms of Service.
          </p>
          <p>
            By using our Service, you consent to the use of cookies and similar technologies in accordance with this Cookie Policy. If you do not agree to our use of cookies, you should disable cookies in your browser settings or refrain from using our Service.
          </p>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on this page and updating the "Last Updated" date.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. What Are Cookies?</h2>
          <p>
            Cookies are small text files that are placed on your device (computer, tablet, or mobile device) when you visit a website. Cookies are widely used to make websites work more efficiently and to provide information to website owners.
          </p>
          <p>
            Cookies contain information that is transferred to your device's hard drive. They help us to improve our Service and to deliver a better and more personalized experience. Cookies allow us to:
          </p>
          <ul>
            <li>Remember your preferences and settings</li>
            <li>Understand how you use our Service</li>
            <li>Improve the functionality and performance of our Service</li>
            <li>Provide personalized content and advertisements</li>
            <li>Analyze traffic and usage patterns</li>
            <li>Ensure security and prevent fraud</li>
          </ul>
          <p>
            Cookies can be "persistent" or "session" cookies. Persistent cookies remain on your device for a set period or until you delete them, while session cookies are deleted when you close your browser.
          </p>
        </div>

        <div className="legal-section">
          <h2>3. Types of Cookies We Use</h2>
          <p>
            We use several types of cookies on our Service, each serving different purposes:
          </p>

          <h3>3.1 Essential Cookies</h3>
          <p>
            Essential cookies are necessary for the Service to function properly. These cookies enable core functionality such as security, network management, and accessibility. Without these cookies, the Service cannot be provided.
          </p>
          <p>
            <strong>Purpose:</strong> These cookies are essential for you to browse the Service and use its features. They are usually set in response to actions made by you, such as setting your privacy preferences, logging in, or filling in forms.
          </p>
          <p>
            <strong>Examples:</strong>
          </p>
          <ul>
            <li>Authentication cookies to keep you logged in</li>
            <li>Security cookies to prevent fraud and protect your account</li>
            <li>Load balancing cookies to distribute traffic across servers</li>
            <li>Session management cookies to maintain your session state</li>
          </ul>
          <p>
            <strong>Retention:</strong> These cookies are typically session cookies that expire when you close your browser, though some may persist for longer periods to maintain your preferences.
          </p>

          <h3>3.2 Functional Cookies</h3>
          <p>
            Functional cookies allow the Service to remember choices you make and provide enhanced, personalized features. These cookies may also be used to remember changes you have made to text size, fonts, and other parts of web pages that you can customize.
          </p>
            <p>
            <strong>Purpose:</strong> These cookies enable the Service to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.
          </p>
          <p>
            <strong>Examples:</strong>
          </p>
          <ul>
            <li>Language preference cookies</li>
            <li>Theme and display preference cookies</li>
            <li>Notification preference cookies</li>
            <li>User interface customization cookies</li>
            <li>Chat widget state cookies</li>
          </ul>
          <p>
            <strong>Retention:</strong> These cookies typically persist for extended periods to remember your preferences across sessions.
          </p>

          <h3>3.3 Analytics Cookies</h3>
          <p>
            Analytics cookies help us understand how visitors interact with our Service by collecting and reporting information anonymously. These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our Service.
          </p>
          <p>
            <strong>Purpose:</strong> These cookies help us understand how users interact with our Service, which pages are most popular, how users navigate through the Service, and identify areas for improvement.
          </p>
          <p>
            <strong>Examples:</strong>
          </p>
          <ul>
            <li>Page view tracking cookies</li>
            <li>User journey tracking cookies</li>
            <li>Feature usage tracking cookies</li>
            <li>Error tracking cookies</li>
            <li>Performance monitoring cookies</li>
          </ul>
          <p>
            <strong>Retention:</strong> Analytics cookies typically persist for varying periods, from session cookies to cookies that last up to 2 years.
          </p>

          <h3>3.4 Performance Cookies</h3>
          <p>
            Performance cookies collect information about how you use our Service, such as which pages you visit most often and if you get error messages from web pages. These cookies don't collect information that identifies you personally; all information collected is aggregated and anonymous.
          </p>
          <p>
            <strong>Purpose:</strong> These cookies help us improve the performance and reliability of our Service by identifying performance issues and optimizing resource delivery.
          </p>
          <p>
            <strong>Examples:</strong>
          </p>
          <ul>
            <li>Load time measurement cookies</li>
            <li>Resource loading optimization cookies</li>
            <li>CDN performance cookies</li>
            <li>Error rate tracking cookies</li>
          </ul>

          <h3>3.5 Targeting and Advertising Cookies</h3>
          <p>
            These cookies may be set through our Service by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant advertisements on other websites.
          </p>
          <p>
            <strong>Purpose:</strong> These cookies are used to deliver advertisements that are more relevant to you and your interests. They are also used to limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns.
          </p>
          <p>
            <strong>Examples:</strong>
          </p>
          <ul>
            <li>Advertising network cookies</li>
            <li>Retargeting cookies</li>
            <li>Conversion tracking cookies</li>
            <li>Social media advertising cookies</li>
          </ul>
          <p>
            <strong>Note:</strong> We may use targeting cookies for our own marketing purposes. You can opt out of these cookies through your browser settings or our cookie preferences center.
          </p>
        </div>

        <div className="legal-section">
          <h2>4. First-Party and Third-Party Cookies</h2>
          
          <h3>4.1 First-Party Cookies</h3>
          <p>
            First-party cookies are set directly by us on your device when you visit our Service. These cookies are used to provide core functionality, remember your preferences, and analyze how you use our Service.
          </p>
          <p>
            Examples of first-party cookies we use include:
          </p>
          <ul>
            <li>Authentication and session management cookies</li>
            <li>User preference cookies</li>
            <li>Analytics cookies (when using our own analytics)</li>
            <li>Security and fraud prevention cookies</li>
          </ul>

          <h3>4.2 Third-Party Cookies</h3>
          <p>
            Third-party cookies are set by domains other than ours. These cookies are typically used for analytics, advertising, and social media integration. We work with trusted third-party service providers who set cookies on our Service.
          </p>
          <p>
            Examples of third-party cookies we may use include:
          </p>
          <ul>
            <li><strong>Analytics Providers:</strong> Google Analytics, Mixpanel, or similar services to analyze usage patterns</li>
            <li><strong>Payment Processors:</strong> Stripe cookies for payment processing and fraud prevention</li>
            <li><strong>Customer Support:</strong> Intercom, Zendesk, or similar services for customer support functionality</li>
            <li><strong>Advertising Networks:</strong> Cookies from advertising networks for targeted advertising (if applicable)</li>
            <li><strong>Social Media:</strong> Cookies from social media platforms for social sharing features</li>
          </ul>
          <p>
            Third-party cookies are subject to the privacy policies of the respective third parties. We encourage you to review their privacy policies to understand how they use cookies and other tracking technologies.
          </p>
        </div>

        <div className="legal-section">
          <h2>5. Specific Cookies We Use</h2>
          <p>
            Below is a detailed list of the specific cookies we use on our Service:
          </p>

          <h3>5.1 Authentication and Session Cookies</h3>
          <table className="cookie-table">
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Type</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>auth_token</td>
                <td>Stores authentication token for logged-in users</td>
                <td>Essential</td>
                <td>Session / 7 days</td>
              </tr>
              <tr>
                <td>session_id</td>
                <td>Maintains user session state</td>
                <td>Essential</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>refresh_token</td>
                <td>Stores refresh token for token renewal</td>
                <td>Essential</td>
                <td>30 days</td>
              </tr>
            </tbody>
          </table>

          <h3>5.2 Preference Cookies</h3>
          <table className="cookie-table">
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Type</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>theme_preference</td>
                <td>Stores user's theme preference (light/dark)</td>
                <td>Functional</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td>language_preference</td>
                <td>Stores user's language preference</td>
                <td>Functional</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td>notification_preferences</td>
                <td>Stores user's notification settings</td>
                <td>Functional</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>

          <h3>5.3 Analytics Cookies</h3>
          <table className="cookie-table">
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Type</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>_ga</td>
                <td>Google Analytics - distinguishes users</td>
                <td>Analytics</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td>_gid</td>
                <td>Google Analytics - distinguishes users</td>
                <td>Analytics</td>
                <td>24 hours</td>
              </tr>
              <tr>
                <td>_gat</td>
                <td>Google Analytics - throttles request rate</td>
                <td>Analytics</td>
                <td>1 minute</td>
              </tr>
            </tbody>
          </table>

          <p>
            <strong>Note:</strong> The specific cookies we use may change over time as we update our Service and integrate new features. We will update this section periodically to reflect current cookie usage.
          </p>
        </div>

        <div className="legal-section">
          <h2>6. Other Tracking Technologies</h2>
          <p>
            In addition to cookies, we may use other tracking technologies to collect information about your use of our Service:
          </p>

          <h3>6.1 Web Beacons</h3>
          <p>
            Web beacons (also known as pixel tags, clear GIFs, or web bugs) are tiny graphics with a unique identifier that may be included in our Service or emails. They allow us to track when emails are opened and links are clicked.
          </p>

          <h3>6.2 Local Storage</h3>
          <p>
            Local storage is a technology that allows websites to store information locally on your device. We may use local storage to store your preferences and improve performance.
          </p>

          <h3>6.3 Session Storage</h3>
          <p>
            Session storage is similar to local storage but is cleared when you close your browser. We may use session storage to maintain temporary data during your session.
          </p>

          <h3>6.4 Fingerprinting</h3>
          <p>
            We may use device fingerprinting technologies to identify devices and detect fraud. This involves collecting information about your device's configuration, such as browser type, screen resolution, and installed plugins.
          </p>
        </div>

        <div className="legal-section">
          <h2>7. How We Use Cookies</h2>
          <p>
            We use cookies for the following purposes:
          </p>

          <h3>7.1 Service Operation</h3>
          <ul>
            <li>To enable core functionality of the Service</li>
            <li>To maintain your login session</li>
            <li>To remember your preferences and settings</li>
            <li>To ensure security and prevent fraud</li>
            <li>To load balance traffic across servers</li>
          </ul>

          <h3>7.2 Personalization</h3>
          <ul>
            <li>To customize your experience based on your preferences</li>
            <li>To remember your language and display settings</li>
            <li>To provide personalized content and recommendations</li>
            <li>To maintain your dashboard and workspace preferences</li>
          </ul>

          <h3>7.3 Analytics and Improvement</h3>
          <ul>
            <li>To understand how users interact with our Service</li>
            <li>To identify popular features and areas for improvement</li>
            <li>To measure the effectiveness of our Service</li>
            <li>To optimize performance and user experience</li>
            <li>To track error rates and technical issues</li>
          </ul>

          <h3>7.4 Security</h3>
          <ul>
            <li>To detect and prevent fraud and abuse</li>
            <li>To verify your identity and authenticate your session</li>
            <li>To protect against unauthorized access</li>
            <li>To monitor for suspicious activity</li>
          </ul>

          <h3>7.5 Marketing (with consent)</h3>
          <ul>
            <li>To deliver relevant advertisements</li>
            <li>To measure the effectiveness of advertising campaigns</li>
            <li>To limit the number of times you see an ad</li>
            <li>To provide social media features</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>8. Managing Cookies</h2>
          <p>
            You have the right to accept or reject cookies. Most web browsers automatically accept cookies, but you can usually modify your browser settings to decline cookies if you prefer.
          </p>

          <h3>8.1 Browser Settings</h3>
          <p>
            You can control cookies through your browser settings. Most browsers allow you to:
          </p>
          <ul>
            <li>View what cookies are stored on your device</li>
            <li>Delete cookies individually or all at once</li>
            <li>Block cookies from specific websites</li>
            <li>Block all cookies</li>
            <li>Delete cookies when you close your browser</li>
            <li>Receive notifications when cookies are set</li>
          </ul>
          <p>
            <strong>Instructions for common browsers:</strong>
          </p>
          <ul>
            <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
            <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
            <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
            <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies and site permissions</li>
          </ul>

          <h3>8.2 Cookie Preferences Center</h3>
          <p>
            We may provide a cookie preferences center where you can manage your cookie preferences for our Service. You can access this through your account settings or through a cookie banner when you first visit our Service.
          </p>

          <h3>8.3 Opt-Out Tools</h3>
          <p>
            You can opt out of certain third-party cookies through industry opt-out tools:
          </p>
          <ul>
            <li><strong>Google Analytics:</strong> Google Analytics Opt-out Browser Add-on</li>
            <li><strong>Advertising:</strong> Digital Advertising Alliance (DAA) opt-out page, Network Advertising Initiative (NAI) opt-out page</li>
            <li><strong>European Users:</strong> Your Online Choices (EU)</li>
          </ul>

          <h3>8.4 Impact of Disabling Cookies</h3>
          <p>
            Please note that disabling cookies may impact your experience on our Service. Some features may not function properly, and you may not be able to access certain parts of the Service. Essential cookies are necessary for the Service to function, and disabling them may prevent you from using the Service.
          </p>
        </div>

        <div className="legal-section">
          <h2>9. Do Not Track Signals</h2>
          <p>
            Some browsers include a "Do Not Track" (DNT) feature that signals to websites that you do not want to be tracked. Currently, there is no industry standard for how to respond to DNT signals. We do not currently respond to DNT browser signals or mechanisms.
          </p>
          <p>
            However, you can control tracking through your browser settings and our cookie preferences as described above.
          </p>
        </div>

        <div className="legal-section">
          <h2>10. Cookies and Personal Data</h2>
          <p>
            Some cookies we use may collect personal data. When cookies collect personal data, our use of that data is governed by our Privacy Policy. We process personal data collected through cookies in accordance with applicable data protection laws.
          </p>
          <p>
            We may combine information collected through cookies with other information we collect about you to provide a more personalized experience and for the purposes described in our Privacy Policy.
          </p>
        </div>

        <div className="legal-section">
          <h2>11. Third-Party Cookies</h2>
          <p>
            Our Service may contain cookies from third parties, such as analytics providers, advertising networks, and social media platforms. These third parties may use cookies to collect information about your online activities across different websites.
          </p>
          <p>
            We do not control these third-party cookies. You should review the privacy policies and cookie policies of these third parties to understand how they use cookies and what information they collect.
          </p>
          <p>
            Common third-party services that may set cookies on our Service include:
          </p>
          <ul>
            <li>Google Analytics for website analytics</li>
            <li>Stripe for payment processing</li>
            <li>Customer support platforms for chat and support features</li>
            <li>Social media platforms for social sharing features</li>
            <li>Advertising networks for targeted advertising (if applicable)</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>12. Cookies and Children</h2>
          <p>
            Our Service is not intended for children under the age of 18. We do not knowingly collect personal information from children through cookies or other tracking technologies. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at info@wrap-x.com.
          </p>
        </div>

        <div className="legal-section">
          <h2>13. International Users</h2>
          <p>
            If you are accessing our Service from outside the United States, please be aware that cookie practices may vary by jurisdiction. We comply with applicable laws regarding cookies and tracking technologies in the jurisdictions where we operate.
          </p>
          <p>
            For users in the European Economic Area (EEA) and United Kingdom, we comply with the ePrivacy Directive and GDPR requirements regarding cookies. We obtain your consent before setting non-essential cookies, as required by law.
          </p>
        </div>

        <div className="legal-section">
          <h2>14. Updates to This Cookie Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by:
          </p>
          <ul>
            <li>Posting the updated Cookie Policy on this page</li>
            <li>Updating the "Last Updated" date</li>
            <li>Sending you an email notification (for significant changes)</li>
            <li>Displaying a notice on our Service</li>
          </ul>
          <p>
            Your continued use of the Service after any changes to this Cookie Policy constitutes your acceptance of the updated policy. We encourage you to review this Cookie Policy periodically.
          </p>
        </div>

        <div className="legal-section">
          <h2>15. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Cookie Policy or our use of cookies, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> info@wrap-x.com
          </p>
          <p>
            We will make every effort to respond to your inquiries in a timely manner and address any concerns you may have about our use of cookies.
          </p>
        </div>

        <div className="legal-footer">
          <p>By using Wrap-X, you acknowledge that you have read, understood, and agree to this Cookie Policy.</p>
        </div>
      </div>
    </div>
  );
}

export default CookiePolicy;

