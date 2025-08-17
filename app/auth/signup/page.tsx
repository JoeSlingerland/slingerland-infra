import SignUpForm from "@/components/signup-form"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </div>
  )
}
