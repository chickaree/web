import { Fragment } from 'react';

const Index = () => (
  <Fragment>
    <style global jsx>{`
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        background-color: #899471;
      }
    `}</style>
    <style jsx>{`
        .app {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        .app img {
          margin: 0 auto;
          padding: 0 1em;
        }
    `}</style>
    <div className="app">
      <img src="/static/icon.svg" alt="chickar.ee" />
    </div>
  </Fragment>
);


export default Index;
