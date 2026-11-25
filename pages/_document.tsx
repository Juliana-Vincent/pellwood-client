import { Html, Head, Main, NextScript } from 'next/document';
import { GTM_ID, gtmHeadScript } from '@/lib/gtm';

export default function Document(props: any) {
  const currentLocale = props.__NEXT_DATA__?.locale || 'cs';

  return (
    <Html lang={currentLocale}>
      <Head>
        {GTM_ID ? <script dangerouslySetInnerHTML={{ __html: gtmHeadScript(GTM_ID) }} /> : null}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
