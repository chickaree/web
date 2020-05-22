import Head from 'next/head';
import Link from 'next/link';

const Layout = ({ children }) => (
  <>
    <Head>
      <title>Chickaree</title>
      <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta key="og:title" property="og:title" content="Chickaree" />
      <meta key="og:description" property="og:description" content="A new social network designed to reach all your followers without an algorithm getting in the way." />
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:image" property="og:image" content="https://chickar.ee/img/og-background.png" />
    </Head>
    <header className="sticky-top">
      <div className="container">
        <div className="row justify-content-center pt-1 pb-1">
          <div className="col-auto">
            <Link href="/">
              <a>
                <img src="/img/icon.svg" alt="chickar.ee" />
              </a>
            </Link>
          </div>
        </div>
      </div>
    </header>
    <div className="content">
      {children}
    </div>
  </>
);

export default Layout;
