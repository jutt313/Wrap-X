import React from 'react';
import '../styles/LegalPages.css';

function Tokusho() {
  return (
    <div className="legal-page-container">
      <div className="legal-page-content">
        <div className="legal-page-header">
          <div className="legal-logo-container">
            <img src="/logo-full.png" alt="Wrap-X" className="legal-logo" />
          </div>
          <h1>特定商取引法に基づく表記</h1>
          <p className="legal-page-subtitle">Specified Commercial Transactions Act Disclosure</p>
          <p className="legal-page-subtitle">最終更新日: {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="legal-section">
          <p>
            本サービスは、特定商取引法に基づき、以下の通り表記いたします。
          </p>
        </div>

        <div className="legal-section">
          <table className="tokusho-table">
            <tbody>
              <tr>
                <th>事業者名</th>
                <td>株式会社 SAAD INTERNATIONAL</td>
              </tr>
              <tr>
                <th>代表者</th>
                <td>CHAUDHARY ABDUL JABBAR JUTT</td>
              </tr>
              <tr>
                <th>所在地</th>
                <td>〒455-0834<br />愛知県名古屋市港区神宮寺1丁目1303-1<br />レンダイスクォッター401</td>
              </tr>
              <tr>
                <th>電話番号</th>
                <td>070-9114-6677</td>
              </tr>
              <tr>
                <th>メールアドレス</th>
                <td>info@wrap-x.com</td>
              </tr>
              <tr>
                <th>販売価格</th>
                <td>
                  <ul className="price-list">
                    <li><strong>Starter プラン:</strong> 月額 $8.79 USD（税込）</li>
                    <li><strong>Professional プラン:</strong> 月額 $19.89 USD（税込）</li>
                    <li><strong>Business プラン:</strong> 月額 $49.99 USD（税込）</li>
                    <li><strong>無料トライアル:</strong> 3日間（登録後自動的に開始）</li>
                  </ul>
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    ※ 価格は予告なく変更される場合があります。最新の価格はサービス内の料金ページをご確認ください。
                  </p>
                </td>
              </tr>
              <tr>
                <th>商品代金以外の必要料金</th>
                <td>
                  <p>以下の費用が別途発生する場合があります：</p>
                  <ul>
                    <li>決済手数料：無料（当社負担）</li>
                    <li>送料：該当なし（デジタルサービス）</li>
                    <li>その他の手数料：なし</li>
                  </ul>
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    ※ お客様が利用する第三者のLLMサービス（OpenAI、Anthropic等）の利用料金は、お客様が直接各サービス提供者に支払う必要があります。
                  </p>
                </td>
              </tr>
              <tr>
                <th>代金の支払方法</th>
                <td>
                  <ul>
                    <li>クレジットカード決済（Visa、Mastercard、American Express、JCB等）</li>
                    <li>Stripe経由での安全な決済処理</li>
                  </ul>
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    ※ その他の決済方法については、お問い合わせください。
                  </p>
                </td>
              </tr>
              <tr>
                <th>代金の支払時期</th>
                <td>
                  <ul>
                    <li><strong>月額プラン:</strong> 毎月の契約開始日に自動課金されます</li>
                    <li><strong>年額プラン:</strong> 契約開始日に年間料金が一括で課金されます（該当する場合）</li>
                    <li><strong>無料トライアル:</strong> トライアル期間中は課金されません。トライアル終了後、選択されたプランに自動的に移行し、課金が開始されます</li>
                  </ul>
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    ※ 支払いは前払い方式です。契約期間中にプランを変更した場合、差額が調整されます。
                  </p>
                </td>
              </tr>
              <tr>
                <th>サービス提供時期</th>
                <td>
                  <p>
                    お支払い完了後、即座にサービスをご利用いただけます。アカウント登録と同時にサービスへのアクセスが可能となります。
                  </p>
                  <ul>
                    <li>アカウント登録後：即座に利用可能</li>
                    <li>プラン変更後：即座に反映</li>
                    <li>APIキー設定後：即座に利用可能</li>
                  </ul>
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    ※ インターネット接続が必要です。サービスは24時間365日利用可能ですが、メンテナンス時を除きます。
                  </p>
                </td>
              </tr>
              <tr>
                <th>返品・交換・キャンセルについて</th>
                <td>
                  <h3 style={{ fontSize: '1.1rem', marginTop: '0', marginBottom: '1rem' }}>返金ポリシー</h3>
                  <p>
                    本サービスはデジタルサービス（SaaS）のため、以下の返金ポリシーが適用されます：
                  </p>
                  <ul>
                    <li><strong>返金:</strong> デジタルサービス（SaaS）の性質上、原則として返金は行いません。ただし、当社の過失によりサービスが提供できない場合、重複課金が発生した場合、または法的に返金が義務付けられている場合は、返金を検討いたします。返金を希望される場合は、info@wrap-x.com までご連絡ください。各ケースを個別に審査いたします。</li>
                    <li><strong>キャンセル:</strong> お客様はいつでもサブスクリプションをキャンセルできます。キャンセル後も、お支払い済みの期間中はサービスをご利用いただけます。</li>
                    <li><strong>自動更新:</strong> サブスクリプションは自動的に更新されます。更新を停止する場合は、更新日の前日までにキャンセルしてください。</li>
                  </ul>

                  <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem' }}>キャンセル方法</h3>
                  <p>以下の方法でキャンセルできます：</p>
                  <ul>
                    <li>アカウント設定ページからキャンセル</li>
                    <li>info@wrap-x.com までメールでご連絡</li>
                    <li>Stripeカスタマーポータルからキャンセル</li>
                  </ul>

                </td>
              </tr>
              <tr>
                <th>動作環境</th>
                <td>
                  <p>本サービスをご利用いただくには、以下の環境が必要です：</p>
                  <ul>
                    <li>インターネット接続</li>
                    <li>モダンなウェブブラウザ（Chrome、Firefox、Safari、Edgeの最新版）</li>
                    <li>JavaScriptが有効になっていること</li>
                    <li>APIアクセスのためのネットワーク環境</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <th>サービス内容</th>
                <td>
                  <p>
                    Wrap-Xは、複数のLLM（大規模言語モデル）プロバイダーを統合管理するAPIラッパーサービスです。
                  </p>
                  <ul>
                    <li>複数のLLMプロバイダー（OpenAI、Anthropic、Google等）への統一APIアクセス</li>
                    <li>プロジェクトベースのLLM設定管理</li>
                    <li>APIキーの安全な管理と保存</li>
                    <li>プロンプト設定とカスタマイズツール</li>
                    <li>使用量分析とモニタリング</li>
                    <li>請求とサブスクリプション管理</li>
                    <li>設定チャットインターフェース（AI支援セットアップ）</li>
                    <li>ウェブフック管理と統合</li>
                    <li>レート制限と使用量制御</li>
                    <li>通知とアラートシステム</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <th>個人情報の取り扱い</th>
                <td>
                  <p>
                    お客様の個人情報の取り扱いについては、<a href="/privacy-policy" style={{ color: 'rgba(99, 102, 241, 0.9)', textDecoration: 'none' }}>プライバシーポリシー</a>をご確認ください。
                  </p>
                </td>
              </tr>
              <tr>
                <th>お問い合わせ</th>
                <td>
                  <p>
                    ご不明な点やご質問がございましたら、以下の連絡先までお気軽にお問い合わせください。
                  </p>
                  <p style={{ marginTop: '1rem' }}>
                    <strong>メール:</strong> info@wrap-x.com<br />
                    <strong>電話:</strong> 070-9114-6677<br />
                    <strong>受付時間:</strong> 平日 9:00 - 18:00（日本時間）
                  </p>
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    ※ お問い合わせへの返信には、通常1-2営業日かかります。
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="legal-section">
          <h2>免責事項</h2>
          <p>
            当社は、本サービスの提供に関して、以下の事項について責任を負いません：
          </p>
          <ul>
            <li>第三者のLLMサービス（OpenAI、Anthropic等）の可用性、性能、または機能性</li>
            <li>お客様が本サービスを通じて送信するデータの内容や正確性</li>
            <li>お客様のAPIキーや認証情報の管理</li>
            <li>インターネット接続の問題やネットワーク障害</li>
            <li>お客様のデバイスやソフトウェアの問題</li>
            <li>本サービスの一時的な中断やメンテナンス</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>その他の重要事項</h2>
          <ul>
            <li>本サービスは、第三者のLLMサービスへのアクセスを提供する中間層として機能します。当社は、基盤となるLLMサービスを直接提供するものではありません。</li>
            <li>お客様は、使用する各LLMプロバイダーの利用規約とプライバシーポリシーに同意する必要があります。</li>
            <li>本サービスの利用は、<a href="/terms" style={{ color: 'rgba(99, 102, 241, 0.9)', textDecoration: 'none' }}>利用規約</a>に従うものとします。</li>
            <li>本表記は、日本の特定商取引法に基づくものです。海外からのご利用については、該当する国の法律が適用される場合があります。</li>
          </ul>
        </div>

        <div className="legal-footer">
          <p>本表記は、特定商取引法に基づき作成されています。最新の情報については、本ページをご確認ください。</p>
        </div>
      </div>
    </div>
  );
}

export default Tokusho;

