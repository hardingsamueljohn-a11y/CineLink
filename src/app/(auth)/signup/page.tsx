import AuthForm from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <main style={{ padding: "24px" }}>
      <AuthForm mode="signup" />
    </main>
  );
}
