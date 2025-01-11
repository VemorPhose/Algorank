import React from 'react';
import Navbar from 'react-bootstrap/Navbar';

function Footer() {
  return (
    <Navbar fixed="bottom" bg="dark" data-bs-theme="dark" className="py-3 w-100 justify-content-center">
      <small className="text-muted">
        © {new Date().getFullYear()} Algorank. Licensed under the{' '}
        <a
          href="https://opensource.org/licenses/MIT"
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none text-primary"
        >
          MIT License
        </a>.
      </small>
    </Navbar>
  );
}

export default Footer;
