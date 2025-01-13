import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <Navbar expand="lg" data-bs-theme="dark" bg="dark" variant="dark" fixed="top">
      <Container>
        <Navbar.Brand as={Link} to="/">Algorank</Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto d-flex align-items-center">
            <Nav.Link as={Link} to="/problems">Problems</Nav.Link>
            <Nav.Link as={Link} to="/contests">Contests</Nav.Link>

            <div style={{ borderLeft: '1px solid #ccc', height: '30px', margin: '0 12px' }}></div>

            <Button as={Link} to="/login" variant="primary" style={{ marginLeft: '10px' }}>
              Login
            </Button>

            <Button as={Link} to="/signup" variant="outline-primary" style={{ marginLeft: '15px' }}>
              Sign Up
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
