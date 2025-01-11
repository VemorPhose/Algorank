// src/components/Header.js

import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';  // Import Link for routing
import './Header.css';

function Header(props) {
  return (
    <Navbar expand="lg" data-bs-theme="dark" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand as={Link} to="/">{props.title}</Navbar.Brand> {/* Home */}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">{props.home}</Nav.Link> {/* Home */}
            <Nav.Link as={Link} to="/problemset">{props.problemset}</Nav.Link> {/* Problemset */}
            <Button as={Link} to="/contests" variant="primary" className="contests-button">
              Contests
            </Button> {/* Contests */}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

Header.propTypes = {
  title: PropTypes.string.isRequired,
  home: PropTypes.string.isRequired,
  problemset: PropTypes.string.isRequired,
};

Header.defaultProps = {
  title: 'Algorank',
  home: 'Home',
  problemset: 'Problemset',
};

export default Header;
