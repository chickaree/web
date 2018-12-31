import React from 'react';
import PropTypes from 'prop-types';
import 'typeface-lato';
import '../styles/styles.scss';

const Layout = ( { children } ) => (
	<React.Fragment>
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
	</React.Fragment>
);

Layout.propTypes = {
	children: PropTypes.node
};

Layout.defaultProps = {
	children: undefined
};

export default Layout;
