import React from 'react';
import '../styles/LegalPages.css';

function PrivacyPolicy() {
  return (
    <div className="legal-page-container">
      <div className="legal-page-content">
        <div className="legal-page-header">
          <div className="legal-logo-container">
            <img src="/logo-full.png" alt="Wrap-X" className="legal-logo" />
          </div>
          <h1>Privacy Policy</h1>
          <p className="legal-page-subtitle">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            Wrap-X ("we", "us", "our", or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service, including our website, mobile application, and related services (collectively, the "Service").
          </p>
          <p>
            Please read this Privacy Policy carefully. By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with our policies and practices, do not use our Service.
          </p>
          <p>
            This Privacy Policy applies to all users of the Service, including visitors, registered users, and subscribers. It describes our practices regarding the collection, use, and disclosure of information that we may collect from and about you.
          </p>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us, information that is automatically collected when you use our Service, and information from third-party sources. The types of information we collect include:
          </p>
          
          <h3>2.1 Information You Provide to Us</h3>
          <p>
            When you register for an account, use our Service, or contact us, we may collect the following information:
          </p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, password, and other registration information</li>
            <li><strong>Profile Information:</strong> Profile picture, display name, and other optional profile details</li>
            <li><strong>Payment Information:</strong> Billing address, payment method details (processed securely through Stripe), and transaction history</li>
            <li><strong>API Keys and Credentials:</strong> Third-party LLM provider API keys and authentication credentials that you provide to access LLM services</li>
            <li><strong>Configuration Data:</strong> Project settings, prompt configurations, API endpoint configurations, and other customization data</li>
            <li><strong>Communication Data:</strong> Messages, feedback, support requests, and other communications you send to us</li>
            <li><strong>Usage Preferences:</strong> Notification preferences, display settings, and other user preferences</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <p>
            When you access or use our Service, we automatically collect certain information about your device and usage patterns:
          </p>
          <ul>
            <li><strong>Device Information:</strong> Device type, operating system, browser type and version, device identifiers, and mobile network information</li>
            <li><strong>Log Data:</strong> IP address, access times, pages viewed, links clicked, and other usage statistics</li>
            <li><strong>Location Information:</strong> General location data derived from your IP address (we do not collect precise GPS location)</li>
            <li><strong>Cookies and Tracking Technologies:</strong> Information collected through cookies, web beacons, and similar tracking technologies (see our Cookie Policy for more details)</li>
            <li><strong>Usage Analytics:</strong> API call volumes, response times, error rates, feature usage, and other performance metrics</li>
            <li><strong>Technical Information:</strong> Browser settings, screen resolution, language preferences, and other technical specifications</li>
          </ul>

          <h3>2.3 Information from Third Parties</h3>
          <p>
            We may receive information about you from third-party services:
          </p>
          <ul>
            <li><strong>Payment Processors:</strong> Transaction information from Stripe and other payment processors</li>
            <li><strong>Authentication Services:</strong> If you choose to authenticate through third-party services (e.g., OAuth providers)</li>
            <li><strong>Analytics Providers:</strong> Aggregated usage data and analytics from third-party analytics services</li>
            <li><strong>LLM Providers:</strong> Usage statistics and error information from third-party LLM services (anonymized and aggregated)</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. How We Use Your Information</h2>
          <p>
            We use the information we collect for various purposes, including:
          </p>
          
          <h3>3.1 Service Provision and Operation</h3>
          <ul>
            <li>To create and manage your account</li>
            <li>To provide, maintain, and improve our Service</li>
            <li>To process transactions and manage subscriptions</li>
            <li>To authenticate your identity and authorize access to the Service</li>
            <li>To store and manage your API keys and configurations securely</li>
            <li>To facilitate communication between your applications and third-party LLM providers</li>
            <li>To monitor and analyze usage patterns and performance</li>
            <li>To detect, prevent, and address technical issues and security threats</li>
          </ul>

          <h3>3.2 Communication</h3>
          <ul>
            <li>To send you service-related notifications, updates, and announcements</li>
            <li>To respond to your inquiries, comments, and support requests</li>
            <li>To send you marketing communications (with your consent, where required by law)</li>
            <li>To notify you about changes to our Service, terms, or policies</li>
            <li>To send billing and payment-related communications</li>
            <li>To provide customer support and technical assistance</li>
          </ul>

          <h3>3.3 Personalization and Improvement</h3>
          <ul>
            <li>To personalize your experience and customize the Service to your preferences</li>
            <li>To develop new features and functionality</li>
            <li>To conduct research and analysis to improve our Service</li>
            <li>To understand how users interact with our Service</li>
            <li>To optimize performance and user experience</li>
          </ul>

          <h3>3.4 Legal and Security</h3>
          <ul>
            <li>To comply with legal obligations and regulatory requirements</li>
            <li>To enforce our Terms of Service and other agreements</li>
            <li>To protect our rights, property, and safety, as well as those of our users and others</li>
            <li>To investigate and prevent fraud, abuse, and other illegal activities</li>
            <li>To respond to legal requests and court orders</li>
            <li>To establish, exercise, or defend legal claims</li>
          </ul>

          <h3>3.5 Business Operations</h3>
          <ul>
            <li>To manage our business operations and internal administration</li>
            <li>To conduct audits and compliance reviews</li>
            <li>To analyze business trends and performance</li>
            <li>To facilitate mergers, acquisitions, or other business transactions</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>4. Information Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We may share your information in the following circumstances:
          </p>

          <h3>4.1 Service Providers</h3>
          <p>
            We may share your information with third-party service providers who perform services on our behalf, including:
          </p>
          <ul>
            <li><strong>Payment Processors:</strong> Stripe and other payment processors to process payments and manage subscriptions</li>
            <li><strong>Hosting and Infrastructure:</strong> Cloud hosting providers and infrastructure services to host and operate our Service</li>
            <li><strong>Analytics Providers:</strong> Analytics services to help us understand usage patterns and improve our Service</li>
            <li><strong>Email Services:</strong> Email service providers to send transactional and marketing emails</li>
            <li><strong>Customer Support:</strong> Customer support platforms to provide assistance and manage support requests</li>
            <li><strong>Security Services:</strong> Security and fraud prevention services to protect our Service and users</li>
          </ul>
          <p>
            These service providers are contractually obligated to protect your information and use it only for the purposes we specify.
          </p>

          <h3>4.2 Third-Party LLM Providers</h3>
          <p>
            When you use our Service to access third-party LLM providers, we transmit your API requests and data to those providers in accordance with your instructions. Your use of third-party LLM services is subject to their respective privacy policies and terms of service.
          </p>

          <h3>4.3 Business Transfers</h3>
          <p>
            If we are involved in a merger, acquisition, asset sale, or other business transaction, your information may be transferred as part of that transaction. We will notify you of any such change in ownership or control of your personal information.
          </p>

          <h3>4.4 Legal Requirements</h3>
          <p>
            We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency). We may also disclose your information to:
          </p>
          <ul>
            <li>Comply with legal obligations and regulatory requirements</li>
            <li>Respond to subpoenas, court orders, or other legal processes</li>
            <li>Protect and defend our rights or property</li>
            <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
            <li>Protect the personal safety of users of the Service or the public</li>
            <li>Protect against legal liability</li>
          </ul>

          <h3>4.5 With Your Consent</h3>
          <p>
            We may share your information with third parties when you have given us your explicit consent to do so.
          </p>

          <h3>4.6 Aggregated and Anonymized Data</h3>
          <p>
            We may share aggregated, anonymized, or de-identified information that cannot reasonably be used to identify you. This information may be used for research, analytics, and other legitimate business purposes.
          </p>
        </div>

        <div className="legal-section">
          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include:
          </p>
          <ul>
            <li><strong>Encryption:</strong> We use industry-standard encryption (TLS/SSL) to protect data in transit and encryption at rest for sensitive data</li>
            <li><strong>Access Controls:</strong> We implement strict access controls and authentication mechanisms to limit access to your information</li>
            <li><strong>Secure Storage:</strong> Your API keys and sensitive credentials are encrypted and stored securely using industry best practices</li>
            <li><strong>Regular Security Audits:</strong> We conduct regular security assessments and vulnerability testing</li>
            <li><strong>Employee Training:</strong> We train our employees on data security and privacy best practices</li>
            <li><strong>Incident Response:</strong> We have procedures in place to detect, respond to, and mitigate security incidents</li>
          </ul>
          <p>
            However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security. You acknowledge that you provide your information at your own risk.
          </p>
          <p>
            You are responsible for maintaining the security of your account credentials. We recommend using strong, unique passwords and enabling two-factor authentication when available.
          </p>
        </div>

        <div className="legal-section">
          <h2>6. Data Retention</h2>
          <p>
            We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Our retention practices include:
          </p>
          <ul>
            <li><strong>Account Information:</strong> We retain your account information for as long as your account is active and for a reasonable period thereafter to comply with legal obligations and resolve disputes</li>
            <li><strong>Transaction Records:</strong> We retain payment and transaction records as required by law and for accounting purposes</li>
            <li><strong>Usage Data:</strong> We retain usage and analytics data for analysis and service improvement purposes</li>
            <li><strong>API Keys:</strong> We retain your API keys for as long as your account is active and you use the Service</li>
            <li><strong>Communication Records:</strong> We retain support communications and correspondence for customer service and legal purposes</li>
          </ul>
          <p>
            When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal, regulatory, or legitimate business purposes. Some information may remain in our backup systems for a limited period.
          </p>
        </div>

        <div className="legal-section">
          <h2>7. Your Privacy Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information. These rights may include:
          </p>

          <h3>7.1 Access and Portability</h3>
          <ul>
            <li>Request access to your personal information</li>
            <li>Request a copy of your personal information in a portable format</li>
            <li>Request information about how we process your personal information</li>
          </ul>

          <h3>7.2 Correction and Update</h3>
          <ul>
            <li>Request correction of inaccurate or incomplete information</li>
            <li>Update your account information through your account settings</li>
          </ul>

          <h3>7.3 Deletion</h3>
          <ul>
            <li>Request deletion of your personal information</li>
            <li>Delete your account and associated data</li>
          </ul>

          <h3>7.4 Restriction and Objection</h3>
          <ul>
            <li>Request restriction of processing of your personal information</li>
            <li>Object to certain types of processing, such as direct marketing</li>
          </ul>

          <h3>7.5 Withdrawal of Consent</h3>
          <ul>
            <li>Withdraw consent where processing is based on consent</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <p>
            To exercise these rights, please contact us at info@wrap-x.com. We will respond to your request within a reasonable timeframe and in accordance with applicable law.
          </p>
          <p>
            Please note that we may need to verify your identity before processing certain requests. We may also decline requests that are excessive, repetitive, or infringe on the rights of others.
          </p>
        </div>

        <div className="legal-section">
          <h2>8. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country.
          </p>
          <p>
            When we transfer your information internationally, we take appropriate safeguards to ensure that your information receives an adequate level of protection. These safeguards may include:
          </p>
          <ul>
            <li>Standard contractual clauses approved by data protection authorities</li>
            <li>Certification schemes and codes of conduct</li>
            <li>Other legally recognized transfer mechanisms</li>
          </ul>
          <p>
            By using our Service, you consent to the transfer of your information to countries outside your country of residence.
          </p>
        </div>

        <div className="legal-section">
          <h2>9. Children's Privacy</h2>
          <p>
            Our Service is not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us at info@wrap-x.com, and we will delete such information from our systems.
          </p>
          <p>
            If we become aware that we have collected personal information from a child under 18 without parental consent, we will take steps to delete that information promptly.
          </p>
        </div>

        <div className="legal-section">
          <h2>10. California Privacy Rights</h2>
          <p>
            If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
          </p>
          <ul>
            <li>Right to know what personal information we collect, use, and disclose</li>
            <li>Right to delete your personal information</li>
            <li>Right to opt out of the sale of personal information (we do not sell personal information)</li>
            <li>Right to non-discrimination for exercising your privacy rights</li>
            <li>Right to correct inaccurate personal information</li>
            <li>Right to limit the use of sensitive personal information</li>
          </ul>
          <p>
            To exercise your California privacy rights, please contact us at info@wrap-x.com.
          </p>
        </div>

        <div className="legal-section">
          <h2>11. European Privacy Rights (GDPR)</h2>
          <p>
            If you are located in the European Economic Area (EEA) or United Kingdom, you have additional rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul>
            <li>Right of access to your personal data</li>
            <li>Right to rectification of inaccurate data</li>
            <li>Right to erasure ("right to be forgotten")</li>
            <li>Right to restrict processing</li>
            <li>Right to data portability</li>
            <li>Right to object to processing</li>
            <li>Rights related to automated decision-making and profiling</li>
          </ul>
          <p>
            Our legal basis for processing your personal information includes:
          </p>
          <ul>
            <li>Performance of a contract (providing the Service)</li>
            <li>Legitimate interests (service improvement, security, fraud prevention)</li>
            <li>Consent (where required by law)</li>
            <li>Legal obligations (compliance with laws and regulations)</li>
          </ul>
          <p>
            To exercise your GDPR rights, please contact us at info@wrap-x.com.
          </p>
        </div>

        <div className="legal-section">
          <h2>12. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to collect and store information about your use of our Service. For detailed information about our use of cookies, please see our Cookie Policy.
          </p>
          <p>
            You can control cookies through your browser settings. However, disabling cookies may affect the functionality of our Service.
          </p>
        </div>

        <div className="legal-section">
          <h2>13. Third-Party Links and Services</h2>
          <p>
            Our Service may contain links to third-party websites, services, or applications that are not owned or controlled by us. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party services you access through our Service.
          </p>
          <p>
            When you use third-party LLM providers through our Service, your data is subject to their privacy policies and terms of service. We are not responsible for how third-party LLM providers collect, use, or disclose your information.
          </p>
        </div>

        <div className="legal-section">
          <h2>14. Marketing Communications</h2>
          <p>
            With your consent (where required by law), we may send you marketing communications about our Service, new features, promotions, and other updates. You can opt out of marketing communications at any time by:
          </p>
          <ul>
            <li>Clicking the "unsubscribe" link in marketing emails</li>
            <li>Updating your communication preferences in your account settings</li>
            <li>Contacting us at info@wrap-x.com</li>
          </ul>
          <p>
            Please note that even if you opt out of marketing communications, we may still send you service-related communications, such as account updates, security alerts, and billing notifications.
          </p>
        </div>

        <div className="legal-section">
          <h2>15. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by:
          </p>
          <ul>
            <li>Posting the updated Privacy Policy on this page</li>
            <li>Updating the "Last Updated" date</li>
            <li>Sending you an email notification (for significant changes)</li>
            <li>Displaying a notice on our Service</li>
          </ul>
          <p>
            Your continued use of the Service after any changes to this Privacy Policy constitutes your acceptance of the updated policy. We encourage you to review this Privacy Policy periodically.
          </p>
        </div>

        <div className="legal-section">
          <h2>16. Data Protection Officer</h2>
          <p>
            If you have questions or concerns about our data protection practices, you can contact our Data Protection Officer (if applicable) or our privacy team at info@wrap-x.com.
          </p>
        </div>

        <div className="legal-section">
          <h2>17. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> info@wrap-x.com
          </p>
          <p>
            We will make every effort to respond to your inquiries in a timely manner and address any concerns you may have.
          </p>
        </div>

        <div className="legal-footer">
          <p>By using Wrap-X, you acknowledge that you have read, understood, and agree to this Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;

