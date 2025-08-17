import LoginForm from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <div className="text-center">
          <a href="/" className="text-blue-600 hover:underline">
            ← Terug naar home
          </a>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
