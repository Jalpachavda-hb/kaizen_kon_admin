import GridShape from "../../components/common/GridShape";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { isAuthenticated } from "../../services/authService";
export default function NotFound() {
  const isAuth = isAuthenticated();

  return (
    <>
      <PageMeta
        title="404 - Page Not Found | Ignitoverse Admin Portal"
        description="The requested page could not be found in Ignitoverse Admin Portal."
      />
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1 bg-gray-50 dark:bg-gray-900">
        <GridShape />
        <div className="mx-auto w-full max-w-[280px] text-center sm:max-w-[480px]">
          <h1 className="mb-4 font-extrabold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl tracking-wide">
            404
          </h1>

          <div className="max-w-[260px] sm:max-w-[320px] mx-auto my-4">
            <img src="/images/error/404.svg" alt="404 Not Found" className="dark:hidden w-full h-auto" />
            <img
              src="/images/error/404-dark.svg"
              alt="404 Not Found"
              className="hidden dark:block w-full h-auto"
            />
          </div>

          <h2 className="mt-6 text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            Page Not Found
          </h2>

          <p className="mt-3 mb-8 text-sm text-gray-600 dark:text-gray-400 sm:text-base leading-relaxed">
            We couldn't find the page you are looking for. The link might be broken, or the URL address was mistyped.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isAuth ? (
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-600 transition-colors"
              >
                Back to Dashboard
              </Link>
            ) : (
              <Link
                to="/signin"
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-600 transition-colors"
              >
                Go to Sign In
              </Link>
            )}
          </div>
        </div>
        {/* <!-- Footer --> */}
        <p className="absolute text-xs text-center text-gray-400 -translate-x-1/2 bottom-6 left-1/2 dark:text-gray-500">
          &copy; {new Date().getFullYear()} Ignitoverse Admin Portal
        </p>
      </div>
    </>
  );
}
