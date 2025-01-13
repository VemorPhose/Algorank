function Footer() {
  return (
    <footer className="bg-dark py-3 w-full">
      <div className="container mx-auto text-center">
        <small className="text-gray-300">
          © {new Date().getFullYear()} Algorank. Licensed under the{' '}
          <a
            href="https://www.gnu.org/licenses/gpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none text-primary hover:underline"
          >
            GNU General Public License v3.0
          </a>
          .
        </small>
      </div>
    </footer>
  );
}

export default Footer;
