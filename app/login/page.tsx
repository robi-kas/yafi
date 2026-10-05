import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl dark:border-gray-800 dark:bg-gray-950/50">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center dark:border-gray-800 dark:bg-gray-900/50 sm:px-16">
          <h3 className="text-xl font-semibold dark:text-gray-100">Sign In to YAFU</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use your email and password to sign in
          </p>
        </div>
        <div className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 dark:bg-gray-900/50 sm:px-16">
          <form className="flex flex-col space-y-4" action={login}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs uppercase text-gray-600 dark:text-gray-400"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="panic@thedis.co"
                autoComplete="email"
                required
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs uppercase text-gray-600 dark:text-gray-400"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Sign In
            </button>
            {searchParams?.message && (
              <p className="mt-4 p-4 bg-red-100 text-red-700 text-center text-sm rounded-md">
                {searchParams.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
