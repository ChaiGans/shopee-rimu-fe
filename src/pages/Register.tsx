import { useAuth } from "@/components/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import RegisterForm from "@/components/register/RegisterForm";

function Register() {
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

  return <RegisterForm authProps={authProps} />;
}

export default Register;
