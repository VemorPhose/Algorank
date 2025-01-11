// src/components/Header.js

import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <Navbar expand="lg" data-bs-theme="dark" className="bg-body-tertiary">
      <Container>
        {/* Brand stays on the left */}
        <Navbar.Brand as={Link} to="/">Algorank</Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          
          {/* Push everything to the right */}
          <Nav className="ms-auto d-flex align-items-center">
            
            {/* Problems and Contests Links */}
            <Nav.Link as={Link} to="/problems">Problems</Nav.Link>
            <Nav.Link as={Link} to="/contests">Contests</Nav.Link>

            {/* Vertical Divider */}
            <div style={{ borderLeft: '1px solid #ccc', height: '30px', margin: '0 12px' }}></div>

            {/* Login and Sign Up Buttons */}
            <Button
              as={Link}
              to="/login"
              variant="primary"
              className="login-button"
              style={{ marginLeft: '10px'}}
            >
              Login
            </Button>

            <Button
              as={Link}
              to="/signup"
              variant="outline-primary"
              className="signup-button"
              style={{ marginLeft: '15px'}}
            >
              Sign Up
            </Button>

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
