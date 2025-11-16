import React from 'react';
import '../styles/LegalPages.css';

function TermsOfService() {
  return (
    <div className="legal-page-container">
      <div className="legal-page-content">
        <div className="legal-page-header">
          <div className="legal-logo-container">
            <img src="/logo-full.png" alt="Wrap-X" className="legal-logo" />
          </div>
          <h1>Terms of Service</h1>
          <p className="legal-page-subtitle">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="legal-section">
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using Wrap-X ("Service", "Platform", "we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms", "Agreement"). If you disagree with any part of these terms, then you may not access the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you ("User", "you", or "your") and Wrap-X. Your use of the Service is conditioned upon your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
          </p>
          <p>
            We reserve the right to modify, update, or change these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. Description of Service</h2>
          <p>
            Wrap-X is a comprehensive LLM (Large Language Model) API wrapper and management platform that enables users to integrate, manage, and deploy multiple LLM providers through a unified interface. Our Service provides:
          </p>
          <ul>
            <li>Unified API access to multiple LLM providers including but not limited to OpenAI, Anthropic, Google, and other compatible providers</li>
            <li>Project-based organization and management of LLM configurations</li>
            <li>API key management and secure storage</li>
            <li>Prompt configuration and customization tools</li>
            <li>Usage analytics and monitoring</li>
            <li>Billing and subscription management</li>
            <li>Configuration chat interface for AI-powered setup assistance</li>
            <li>Webhook management and integration</li>
            <li>Rate limiting and usage controls</li>
            <li>Notification and alert systems</li>
          </ul>
          <p>
            The Service acts as an intermediary layer between your applications and various LLM providers, facilitating seamless integration, management, and monitoring of AI-powered features. We do not provide the underlying LLM services directly but enable access to third-party LLM providers through our platform.
          </p>
          <p>
            We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. We may also impose limits on certain features or restrict your access to parts or all of the Service without notice or liability.
          </p>
        </div>

        <div className="legal-section">
          <h2>3. User Accounts and Registration</h2>
          <p>
            To access certain features of the Service, you must register for an account. When you register, you agree to provide accurate, current, and complete information about yourself as prompted by the registration form. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
          <p>
            You must be at least 18 years old to use the Service. By registering, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into this Agreement. If you are registering on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
          </p>
          <p>
            You agree to immediately notify us of any unauthorized use of your account or any other breach of security. We cannot and will not be liable for any loss or damage arising from your failure to comply with this security obligation.
          </p>
          <p>
            You are responsible for maintaining the security of your account, including but not limited to:
          </p>
          <ul>
            <li>Using a strong, unique password</li>
            <li>Not sharing your account credentials with third parties</li>
            <li>Logging out of your account when using shared devices</li>
            <li>Keeping your contact information up to date</li>
            <li>Enabling two-factor authentication when available</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate your account if we suspect any unauthorized access, fraudulent activity, or violation of these Terms.
          </p>
        </div>

        <div className="legal-section">
          <h2>4. Acceptable Use Policy</h2>
          <p>
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service:
          </p>
          <ul>
            <li>In any way that violates any applicable federal, state, local, or international law or regulation</li>
            <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent, including any "junk mail", "chain letter", "spam", or any other similar solicitation</li>
            <li>To impersonate or attempt to impersonate Wrap-X, a Wrap-X employee, another user, or any other person or entity</li>
            <li>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful, or in connection with any unlawful, illegal, fraudulent, or harmful purpose or activity</li>
            <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by us, may harm Wrap-X or users of the Service or expose them to liability</li>
            <li>To use automated systems, including "robots", "spiders", or "offline readers", to access the Service in a manner that sends more request messages to our servers than a human can reasonably produce in the same period</li>
            <li>To interfere with or disrupt the Service or servers or networks connected to the Service, or disobey any requirements, procedures, policies, or regulations of networks connected to the Service</li>
            <li>To collect or store personal data about other users without their express permission</li>
            <li>To use the Service to generate, distribute, or facilitate the distribution of harmful, offensive, or illegal content</li>
            <li>To reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service</li>
            <li>To use the Service to compete with Wrap-X or to build a competing service</li>
            <li>To abuse, harass, threaten, harm, or otherwise violate the legal rights of others</li>
            <li>To violate any intellectual property rights, including copyrights, patents, trademarks, or trade secrets</li>
            <li>To transmit any viruses, malware, or other malicious code</li>
            <li>To attempt to gain unauthorized access to any portion of the Service or any other systems or networks connected to the Service</li>
          </ul>
          <p>
            We reserve the right to investigate violations of these Terms and may involve law enforcement authorities in prosecuting users who violate these Terms. We may, without prior notice, remove any content or suspend or terminate your access to the Service for any reason, including if we determine that you have violated these Terms or engaged in any activity that we deem harmful to the Service or other users.
          </p>
        </div>

        <div className="legal-section">
          <h2>5. API Keys and Third-Party Services</h2>
          <p>
            The Service requires you to provide API keys from third-party LLM providers (such as OpenAI, Anthropic, Google, etc.) to access their services through our platform. You are solely responsible for:
          </p>
          <ul>
            <li>Obtaining and maintaining valid API keys from third-party LLM providers</li>
            <li>Complying with the terms of service and usage policies of all third-party LLM providers</li>
            <li>All costs and fees associated with your use of third-party LLM services</li>
            <li>Monitoring and managing your usage of third-party services to avoid exceeding quotas or incurring unexpected charges</li>
            <li>Keeping your API keys secure and confidential</li>
            <li>Immediately revoking or rotating API keys if you suspect they have been compromised</li>
          </ul>
          <p>
            We store your API keys using industry-standard encryption. However, you acknowledge that no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security of your API keys.
          </p>
          <p>
            We are not responsible for the availability, performance, or functionality of third-party LLM services. Any issues, outages, or changes to third-party services are beyond our control, and we shall not be liable for any damages resulting from such issues.
          </p>
          <p>
            You agree that we may use your API keys solely for the purpose of providing the Service to you, in accordance with these Terms and your instructions. We will not use your API keys for any other purpose without your explicit consent.
          </p>
        </div>

        <div className="legal-section">
          <h2>6. Intellectual Property Rights</h2>
          <p>
            The Service and its original content, features, and functionality are and will remain the exclusive property of Wrap-X and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
          </p>
          <p>
            You retain all ownership rights to any content, data, prompts, configurations, or other materials that you create, upload, or provide through the Service ("User Content"). By using the Service, you grant us a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform your User Content solely for the purpose of providing and improving the Service.
          </p>
          <p>
            You represent and warrant that you own or have the necessary licenses, rights, consents, and permissions to grant the license described above, and that your User Content does not violate any third-party rights, including intellectual property rights, privacy rights, or publicity rights.
          </p>
          <p>
            We respect the intellectual property rights of others. If you believe that any content on the Service infringes your copyright, please contact us at info@wrap-x.com with a detailed description of the alleged infringement, and we will investigate and take appropriate action in accordance with applicable law.
          </p>
        </div>

        <div className="legal-section">
          <h2>7. Billing and Payment Terms</h2>
          <p>
            The Service offers various subscription plans with different features and usage limits. By subscribing to a paid plan, you agree to pay all fees associated with your selected plan. All fees are charged in advance on a recurring basis (monthly or annually, depending on your selection).
          </p>
          <p>
            <strong>Payment Processing:</strong> Payments are processed through Stripe, a third-party payment processor. By providing payment information, you agree to Stripe's terms of service and privacy policy. We do not store your complete payment card information on our servers.
          </p>
          <p>
            <strong>Pricing:</strong> We reserve the right to change our pricing at any time. Price changes will not affect your current billing period but will apply to subsequent billing cycles. We will notify you of any price changes at least 30 days in advance.
          </p>
          <p>
            <strong>Free Trial:</strong> New users may be eligible for a free trial period. The duration and terms of the free trial are subject to change at our discretion. At the end of the free trial period, your account will automatically convert to a paid subscription unless you cancel before the trial ends.
          </p>
          <p>
            <strong>Automatic Renewal:</strong> Unless you cancel your subscription, it will automatically renew at the end of each billing period. You authorize us to charge the applicable subscription fees to your payment method on file.
          </p>
          <p>
            <strong>No Refunds:</strong> All fees paid for the Service are non-refundable. This includes but is not limited to subscription fees, usage-based charges, and any other fees associated with the Service. We do not provide refunds or credits for partial billing periods, unused features, or any other reason, except as required by applicable law.
          </p>
          <p>
            <strong>Cancellation:</strong> You may cancel your subscription at any time through your account settings or by contacting us at info@wrap-x.com. Cancellation will take effect at the end of your current billing period. You will continue to have access to the Service until the end of your paid period.
          </p>
          <p>
            <strong>Failed Payments:</strong> If a payment fails, we may suspend or terminate your access to the Service until payment is successfully processed. We are not responsible for any service interruption resulting from failed payments.
          </p>
          <p>
            <strong>Taxes:</strong> You are responsible for any taxes, duties, or government charges imposed on your use of the Service. All fees are exclusive of applicable taxes unless otherwise stated.
          </p>
        </div>

        <div className="legal-section">
          <h2>8. Data and Privacy</h2>
          <p>
            Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your information.
          </p>
          <p>
            You acknowledge that we may collect, store, and process certain information about you and your use of the Service, including but not limited to:
          </p>
          <ul>
            <li>Account information (name, email address, etc.)</li>
            <li>Usage data and analytics</li>
            <li>API keys and configuration data</li>
            <li>Payment and billing information</li>
            <li>Log data and technical information</li>
          </ul>
          <p>
            We implement industry-standard security measures to protect your data. However, you acknowledge that no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          <p>
            You are responsible for ensuring that any data you process through the Service, including data sent to third-party LLM providers, complies with all applicable laws and regulations, including data protection and privacy laws.
          </p>
        </div>

        <div className="legal-section">
          <h2>9. Service Availability and Modifications</h2>
          <p>
            We strive to provide reliable and continuous access to the Service. However, we do not guarantee that the Service will be available at all times or that it will be free from errors, interruptions, or downtime. The Service may be unavailable due to:
          </p>
          <ul>
            <li>Scheduled maintenance and updates</li>
            <li>Unscheduled maintenance or emergency repairs</li>
            <li>Technical failures or system errors</li>
            <li>Issues with third-party services or infrastructure</li>
            <li>Force majeure events</li>
            <li>Network or connectivity issues</li>
          </ul>
          <p>
            We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. We may also impose limits on usage, restrict access to certain features, or change the Service's functionality.
          </p>
          <p>
            We are not liable for any damages or losses resulting from Service unavailability, interruptions, or modifications. We recommend that you maintain backups of any important data or configurations.
          </p>
        </div>

        <div className="legal-section">
          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WRAP-X, ITS AFFILIATES, AGENTS, DIRECTORS, EMPLOYEES, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
          </p>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WRAP-X ASSUMES NO LIABILITY OR RESPONSIBILITY FOR ANY (I) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT, (II) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO OR USE OF OUR SERVICE, (III) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN, (IV) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM OUR SERVICE, (V) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE, WHICH MAY BE TRANSMITTED TO OR THROUGH OUR SERVICE BY ANY THIRD PARTY, AND/OR (VI) ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF YOUR USE OF ANY CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICE.
          </p>
          <p>
            IN NO EVENT SHALL WRAP-X'S TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES, OR CAUSES OF ACTION EXCEED THE AMOUNT YOU HAVE PAID TO WRAP-X IN THE TWELVE (12) MONTHS PRIOR TO THE ACTION GIVING RISE TO LIABILITY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
          </p>
          <p>
            SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES OR THE LIMITATION OR EXCLUSION OF LIABILITY FOR INCIDENTAL OR CONSEQUENTIAL DAMAGES. ACCORDINGLY, SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
          </p>
        </div>

        <div className="legal-section">
          <h2>11. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Wrap-X and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of:
          </p>
          <ul>
            <li>Your use and access of the Service</li>
            <li>Your violation of any term of these Terms</li>
            <li>Your violation of any third party right, including without limitation any copyright, property, or privacy right</li>
            <li>Any claim that your User Content caused damage to a third party</li>
            <li>Your violation of any applicable law or regulation</li>
            <li>Your use of third-party LLM services in violation of their terms of service</li>
            <li>Any content or data you transmit through the Service</li>
          </ul>
          <p>
            This defense and indemnification obligation will survive these Terms and your use of the Service.
          </p>
        </div>

        <div className="legal-section">
          <h2>12. Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
          </p>
          <p>
            If you wish to terminate your account, you may simply discontinue using the Service or cancel your subscription through your account settings. Upon termination, your right to use the Service will immediately cease.
          </p>
          <p>
            All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
          </p>
          <p>
            Upon termination, we may delete your account data, User Content, and other information associated with your account. We are not obligated to retain any data after termination, and you are responsible for backing up any data you wish to retain.
          </p>
        </div>

        <div className="legal-section">
          <h2>13. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WRAP-X AND ITS SUPPLIERS AND LICENSORS HEREBY DISCLAIM ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, NON-INFRINGEMENT, AND FITNESS FOR PARTICULAR PURPOSE.
          </p>
          <p>
            WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, THAT DEFECTS WILL BE CORRECTED, OR THAT THE SERVICE OR THE SERVER THAT MAKES IT AVAILABLE IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
          </p>
          <p>
            WE DO NOT WARRANT OR MAKE ANY REPRESENTATIONS REGARDING THE USE OR THE RESULTS OF THE USE OF THE SERVICE IN TERMS OF ITS CORRECTNESS, ACCURACY, RELIABILITY, OR OTHERWISE.
          </p>
          <p>
            WE ARE NOT RESPONSIBLE FOR THE ACCURACY, RELIABILITY, OR AVAILABILITY OF THIRD-PARTY LLM SERVICES. YOUR USE OF THIRD-PARTY SERVICES IS SUBJECT TO THEIR RESPECTIVE TERMS OF SERVICE AND PRIVACY POLICIES.
          </p>
        </div>

        <div className="legal-section">
          <h2>14. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms shall be interpreted and governed by the laws of the jurisdiction in which Wrap-X operates, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
          </p>
          <p>
            If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our Service, and supersede and replace any prior agreements we might have had between us regarding the Service.
          </p>
          <p>
            Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of a recognized arbitration organization, except where prohibited by law. You waive any right to a jury trial and agree to resolve disputes on an individual basis.
          </p>
        </div>

        <div className="legal-section">
          <h2>15. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>
          <p>
            By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
          </p>
        </div>

        <div className="legal-section">
          <h2>16. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> info@wrap-x.com
          </p>
          <p>
            We will make every effort to respond to your inquiries in a timely manner.
          </p>
        </div>

        <div className="legal-section">
          <h2>17. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect and enforceable.
          </p>
        </div>

        <div className="legal-section">
          <h2>18. Entire Agreement</h2>
          <p>
            These Terms, together with our Privacy Policy and any other legal notices published by us on the Service, shall constitute the entire agreement between you and Wrap-X concerning the Service. If any provision of these Terms is deemed invalid by a court of competent jurisdiction, the invalidity of such provision shall not affect the validity of the remaining provisions of these Terms, which shall remain in full force and effect.
          </p>
        </div>

        <div className="legal-section">
          <h2>19. Assignment</h2>
          <p>
            You may not assign or transfer these Terms, by operation of law or otherwise, without our prior written consent. Any attempt by you to assign or transfer these Terms, without such consent, will be null and void. We may freely assign or transfer these Terms without restriction. Subject to the foregoing, these Terms will bind and inure to the benefit of the parties, their successors, and permitted assigns.
          </p>
        </div>

        <div className="legal-section">
          <h2>20. Waiver</h2>
          <p>
            No waiver by Wrap-X of any term or condition set forth in these Terms shall be deemed a further or continuing waiver of such term or condition or a waiver of any other term or condition, and any failure of Wrap-X to assert a right or provision under these Terms shall not constitute a waiver of such right or provision.
          </p>
        </div>

        <div className="legal-footer">
          <p>By using Wrap-X, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;

