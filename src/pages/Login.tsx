import LoginForm from "@/components/login/LoginForm";
import { useAuth } from "@/components/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const authProps = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    // check if authenticated
    if (authProps) {
      if (authProps.isAuthenticated) {
        navigate("/");
      }
    }
  }, [authProps, navigate]);

  return <LoginForm authProps={authProps} />;
}

export default Login;
