import Head from 'next/head';

function Index() {
  return (
    <>
      <style global jsx>
        {`
        body {
          background-color: #d0d5c6;
          color: #3d4037;
        }
      `}
      </style>
      <Head>
        <title>Chickaree</title>
        <meta property="og:title" content="Chickaree" />
        <meta property="og:description" content="A new social network designed to reach all your followers without an algorithm getting in the way." />
        <meta property="og:url" content="https://chickar.ee/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://chickar.ee/static/og-background.png" />
      </Head>
      <div className="container">
        <div className="landing row justify-content-center align-items-center min-vh-100">
          <div className="col-12 col-sm-9 col-md-6 col-lg-4">
            <img src="/img/logo.svg" alt="chickar.ee" className="d-block w-100" />
          </div>
        </div>
      </div>
    </>
  );
}


export default Index;
