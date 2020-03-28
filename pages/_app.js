import '../styles/styles.scss';

export default function Chickaree({ Component, pageProps }) {
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <Component {...pageProps} />
  );
}
