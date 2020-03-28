import Head from 'next/head';

const Layout = ({ children }) => (
  <>
    <Head>
      <title>Chickaree</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta property="og:title" content="Chickaree" />
      <meta property="og:description" content="A new social network designed to reach all your followers without an algorithm getting in the way." />
      <meta property="og:url" content="https://chickar.ee/" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="https://chickar.ee/img/og-background.png" />
    </Head>
    <header className="sticky-top">
      <div className="container">
        <div className="row justify-content-center pt-1 pb-1">
          <div className="col-auto">
            <img src="/img/icon.svg" alt="chickar.ee" />
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
