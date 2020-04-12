import Head from 'next/head';

function PageTitle({
  parts = [],
}) {
  const title = [
    ...parts,
    'Chickaree',
  ].filter((part) => !!part).join(' | ');

  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
}

export default PageTitle;
