import { Fragment } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import 'typeface-lato';
import '../styles/styles.scss';

const Layout = ( { children } ) => (
	<Fragment>
		<Head>
			<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
		</Head>
		<header className="sticky-top">
			<div className="container">
				<div className="row justify-content-center pt-1 pb-1">
					<div className="col-auto">
						<img src="/static/icon.svg" alt="chickar.ee" />
					</div>
				</div>
			</div>
		</header>
		<div className="content">
			{children}
		</div>
	</Fragment>
);

Layout.propTypes = {
	children: PropTypes.node
};

Layout.defaultProps = {
	children: undefined
};

export default Layout;
