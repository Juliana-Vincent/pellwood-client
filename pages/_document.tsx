import { Html, Head, Main, NextScript } from 'next/document';

export default function Document(props: any) {
  const currentLocale = props.__NEXT_DATA__?.locale || 'cs';

  return (
    <Html lang={currentLocale}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
