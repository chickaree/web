import { useContext, useMemo } from 'react';
import Head from 'next/head';
import { BananaContext } from '@wikimedia/react.i18n';
import getResourceMetadata from '../utils/resource/metadata';

function useResourceMetadata(resource) {
  const banana = useContext(BananaContext);

  return useMemo(() => (
    getResourceMetadata(resource, banana.i18n('name'))
  ), [
    banana,
    resource,
  ]);
}

function Meta({
  resource,
}) {
  const {
    og, schema, title, robots,
  } = useResourceMetadata(resource);

  return (
    <Head>
      {title ? <title>{title}</title> : null}
      {robots ? <meta key="robots" name="robots" content={robots} /> : null}
      {og.title ? <meta key="og:title" property="og:title" content={og.title} /> : null}
      {og.url ? <meta key="og:url" property="og:url" content={og.url} /> : null}
      {og.description ? <meta key="og:description" property="og:description" content={og.description} /> : null}
      {og.image ? <meta key="og:image" property="og:image" content={og.image} /> : null}
      {og.type ? <meta key="og:type" property="og:type" content={og.type} /> : null}
      <script key="schema" type="application/ld+json">{JSON.stringify(schema)}</script>
    </Head>
  );
}

export default Meta;
