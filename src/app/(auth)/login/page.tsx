import AuthForm from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <main style={{ padding: "24px" }}>
      <AuthForm mode="login" />
    </main>
  );
}
