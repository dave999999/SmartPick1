import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">SmartPick</h3>
            <p className="text-sm text-gray-600">
              Smart reservations from local partners in Georgia.
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
                >
                  Contact / Support
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@smartpick.ge"
                  className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
                >
                  support@smartpick.ge
                </a>
              </li>
              <li>
                <a
                  href="tel:+995557737399"
                  className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
                >
                  +995 557 737 399
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-center text-gray-600">
            © {currentYear} SmartPick. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
