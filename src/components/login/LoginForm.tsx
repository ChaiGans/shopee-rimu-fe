import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loginShop } from "@/services/loginService";
import { useState, useEffect } from "react";
import { useToast } from "../ui/use-toast";
import { redirect } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const loginFormSchema = z.object({
  username: z.string().min(6, {
    message: "Shop ID must be at least 6 numbers.",
  }),
  password: z.string().min(10, {
    message: "Shop Code must be filled.",
  }),
});

const LoginForm = () => {
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const loginForm = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (errorMessage.length !== 0) {
      toast({
        title: "Error Login Occured",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [errorMessage.length]);

  async function onSubmit(values: z.infer<typeof loginFormSchema>) {
    try {
      await loginShop({
        username: values.username,
        password: values.password,
      });

      toast({
        title: "Login Success",
        description: `User with username ${values.username} successfully login.`,
        variant: "success",
      });

      return redirect("/");
    } catch (error) {
      console.error("Login Error:", error);
      setErrorMessage("Failed to login. Please check your credentials.");
    }
  }

  function handleEyeClick() {
    setShowPassword(!showPassword);
  }

  return (
    <div className="font-sans flex min-h-screen items-center justify-center">
      <div className="relative min-h-screen flex flex-col justify-center items-center ">
        <div className="relative sm:max-w-sm w-full">
          <div className="card bg-blue-400 shadow-lg w-full h-full rounded-3xl absolute transform -rotate-6"></div>
          <div className="card bg-red-400 shadow-lg w-full h-full rounded-3xl absolute transform rotate-6"></div>
          <div className="relative w-full rounded-3xl px-6 py-4 bg-gray-100 shadow-md">
            <Label className="block mt-3 text-sm text-gray-700 text-center font-semibold">
              Login
            </Label>
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onSubmit)}
                className="mt-10"
              >
                <div>
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block mt-3 text-sm text-gray-700 text-start font-semibold">
                          Username <span className="text-red-700">*)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="username"
                            className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>This is your shop id.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-7">
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block mt-3 text-sm text-gray-700 text-start font-semibold">
                          Password <span className="text-red-700">*)</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex flex-row justify-between items-center">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="password"
                              className="mt-1 block w-full border-none bg-gray-100 h-11 rounded-xl shadow-lg hover:bg-blue-100 focus:bg-blue-100 focus:ring-0"
                              required
                              {...field}
                            />
                            {showPassword ? (
                              <FaEye
                                className="absolute right-12"
                                onClick={handleEyeClick}
                              />
                            ) : (
                              <FaEyeSlash
                                className="absolute right-12"
                                onClick={handleEyeClick}
                              />
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          WARNING: Do not let anyone know your password.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-7">
                  <Button
                    type="submit"
                    className="bg-blue-500 w-full py-3 rounded-xl text-white shadow-xl hover:shadow-inner focus:outline-none transition duration-500 ease-in-out transform hover:-translate-x hover:scale-105"
                  >
                    Login
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
