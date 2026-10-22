import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Admin Sign In | Kaizen Con 2027"
        description="Secure Administrator Sign In for Kaizen Con 2027 Conference Administration Portal"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
