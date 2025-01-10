import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
// import NavDropdown from 'react-bootstrap/NavDropdown';
import PropTypes from 'prop-types'
import './Header.css';

function Header(props) {
  return (
    <Navbar expand="lg" data-bs-theme="dark" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand href="#home">{props.title}</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="#home">{props.home}</Nav.Link>
            <Nav.Link href="#problemset">{props.problemset}</Nav.Link>
            <Button href="#contests" variant="primary" className="contests-button">Contests</Button>
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