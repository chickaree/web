import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import ReactPixel from 'react-facebook-pixel';
import 'typeface-lato';
import 'typeface-oswald';
import '../styles/index.scss';

const Index = () => {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('ready');
  const [formData, setFormData] = useState({
    email: '',
    website: '',
  });

  useEffect(() => {
    fetch('/api/lead').then(response => response.json()).then(data => setCount(data.count));
  }, []);

  useEffect(() => {
    ReactPixel.init('574313673080857');
    ReactPixel.pageView();
  }, []);

  const disabled = status === 'sending' ? true : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    const response = await fetch('/api/lead', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      setStatus('done');
      ReactPixel.track('Lead');
    } else {
      setStatus('error');
    }
  }

  const handleChange = (e) => {
    setStatus('ready');
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  let line = <span>&nbsp;</span>;
  if (count >= 2) {
    line = (
      <span>
        {count.toLocaleString()} people ahead of you
      </span>
    );
  }

  let form = null;
  if (status === 'done') {
    form = (
      <div className="ahead text-center">
        Thank you! We&apos;ll let you know when we are ready!
      </div>
    );
  } else {
    if (status === 'error') {
      line = (<span>Something went wrong. Please try again later.</span>);
    }
    form = (
      <>
        <form className="mb-3" onSubmit={handleSubmit}>
          <div className="form-group mb-3">
            <label htmlFor="email">Email</label>
            <input type="email" value={formData.email} className="form-control" id="email" name="email" required onChange={handleChange} disabled={disabled} />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="website">Website</label>
            <input type="url" value={formData.website} className="form-control" id="website" placeholder="https://" name="website" onChange={handleChange} disabled={disabled} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={disabled}>Claim your spot</button>
        </form>
        <div className="ahead text-center">
          {line}
        </div>
      </>
    );
  }

  const desc = 'A new social network designed to reach all your followers without an algorithm getting in the way.';

  return (
    <>
      <Head>
        <meta property="og:title" content="Chickaree" />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content="https://chickar.ee/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://chickar.ee/static/og-background.png" />
      </Head>
      <div className="container">
        <div className="landing row justify-content-center align-items-center min-vh-100">
          <div className="pt-4 pb-3 col-12 col-sm-9 col-md-6 col-lg-4">
            <img src="/static/logo.svg" alt="chickar.ee" className="d-block w-75 mx-auto mb-3" />
            <h4 className="mb-3">{desc}</h4>
            {form}
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
