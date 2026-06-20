"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { login, signup } from "@/services/authService";
import { isAuthenticated, setAuthToken } from "@/services/tokenStorage";

const Login = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });
  const [isSignup, setIsSignup] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/chat");
    }
  }, [router]);

  useEffect(() => {
    clearErrors();
  }, [isSignup, clearErrors]);

  const togglepass = () => {
    setShowPass(!showPass);
  };

  const onsubmit = async (data) => {
    setLoading(true);
    setMessage("");

    try {
      if (isSignup) {
        await signup({
          name: data.name,
          email: data.email,
          password: data.password,
          roles: [data.role],
        });

        setMessage("Account created. Please log in.");
        setIsSignup(false);
        reset({ name: "", email: data.email, password: "", role: "user" });
        return;
      }

      const response = await login({
        email: data.email,
        password: data.password,
      });

      if (response?.token) {
        setAuthToken(response.token);
      }

      router.replace("/chat");
    } catch (error) {
      const apiMessage = error?.message || error?.errors?.[0]?.message || "Something went wrong";
      setMessage(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
     <form onSubmit={handleSubmit(onsubmit)}>
    <div className="w-full h-screen flex overflow-hidden relative">
      <div
        className={`flex-1 flex justify-center items-center transition-all duration-700 ease-in-out ${
          isSignup ? "translate-x-full" : "translate-x-0"
        }`}
      >
       
        <div className="flex flex-col items-center mt-20 w-125 h-125">
          <h1 className="text-3xl font-bold my-10">
            {isSignup ? "Create Account" : "Welcome Back !!"}
          </h1>

          {message ? (
            <p className={`mb-4 text-sm ${message.includes("created") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          ) : null}

          {isSignup && (
            <div className="relative w-90 mb-6">
              <input
                type="text"
                placeholder="Full name"
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-[50px] focus:ring-blue-500 focus:border-blue-500 block ps-5 p-3"
                {...register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
              />
              {errors.name && <span className="absolute mt-1 text-red-600">{errors.name.message}</span>}
            </div>
          )}

          {/* Email Input */}
          <div className="relative w-90 mb-10">
            {" "}
            <div className="absolute mt-4.5 inset-s-0 flex items-center ps-5 pointer-events-none">
              {" "}
              <svg
                className="w-4 h-4 text-gray-500 "
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 16"
              >
                {" "}
                <path d="m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z" />{" "}
                <path d="M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z" />{" "}
              </svg>{" "}
            </div>{" "}
            <input
              type="email"
              id="input-group-1"
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-[50px] focus:ring-blue-500 focus:border-blue-500 block ps-13 p-3 "
              placeholder="Email.com"
              {...register("email",{
                required:"Email is required",
                pattern:{
                   value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                   message: "Invalid email format",
                }
              })}
            />
            {errors.email && <span className="absolute mt-1 text-red-600">{errors.email.message}</span> }
          </div>
          {/* Password Input */}
          <div className="relative w-90 mb-6">
            {" "}
            <div className="absolute mt-3.5 inset-s-0 flex items-center ps-5 pointer-events-none">
              {" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 11c1.657 0 3 1.343 3 3v2a3 3 0 0 1-6 0v-2c0-1.657 1.343-3 3-3z"
                />{" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 11V7a5 5 0 0 0-10 0v4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"
                />{" "}
              </svg>{" "}
            </div>{" "}
            <input
              type={showPass ? "text" : "password"}
              id="input-group-1"
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-[50px] focus:ring-blue-500 focus:border-blue-500 block ps-13 p-3 "
              placeholder="Enter your password"
              {...register("password",{
                required:"password is required",
                minLength:{
                  value:6,
                  message:"Password should be at least 6 characters"
                }
              })}
            />
            {errors.password && <span className="absolute mt-6 text-red-600">{errors.password.message}</span>}
            <img
              src={showPass ? "/view.png" : "/hide.png"}
              className="absolute right-4.5 top-3.75 w-4.5 cursor-pointer"
              alt="eye icon"
              onClick={togglepass}
            />{" "}
            <span className="absolute mt-1 right-2 cursor-pointer">
              <h1 className="text-sm">Forget Password?</h1>
            </span>{" "}
          </div>

          {/* Role Field - Only show during signup */}
          {isSignup && (
            <div className="relative w-90 mt-6">
              <div className="absolute mt-3.5 inset-s-0 flex items-center ps-5 pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <select
                id="input-group-1"
                className="w-full bg-gray-50 border border-gray-300 text-gray-400 text-md rounded-[50px] focus:ring-blue-500 focus:border-blue-500 block ps-13 p-3 appearance-none cursor-pointer"
                {...register("role", {
                  required: "Role is required"
                })}
              >
                <option value="">Select Role</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && <span className="absolute mt-1 text-red-600">{errors.role.message}</span>}
            </div>
          )}

          {/* Button */}
          <button disabled={loading} className="mt-10 w-90 text-white bg-[rgb(252,194,164)] hover:bg-[rgb(250,174,136)] focus:ring-4 focus:ring-blue-300 font-medium rounded-[50px] text-sm px-5 py-3.5 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? "Please wait..." : isSignup ? "Sign Up" : "Sign In"}
          </button>

          {/* Switch Mode */}
          <div className="relative top-10">
            {!isSignup ? (
              <h1>
                Dont Have an Account?{" "}
                <span
                  className="font-bold text-[rgb(252,194,164)] cursor-pointer"
                  onClick={() => setIsSignup(true)}
                >
                  Register
                </span>
              </h1>
            ) : (
              <h1>
                Already have an Account?{" "}
                <span
                  className="font-bold text-[rgb(252,194,164)] cursor-pointer"
                  onClick={() => setIsSignup(false)}
                >
                  Login
                </span>
              </h1>
            )}
          </div>
        </div>
      </div>

      {/* Image / Background Container */}
      <div
        className={`relative flex-1 flex items-center justify-center transition-all duration-700 ease-in-out ${
          isSignup ? "-translate-x-full" : "translate-x-0"
        } overflow-hidden`}
      >
        <div className="absolute w-75 rounded-t-[300px] h-128.75 bg-[rgba(250,216,200,1)] top-31.5">
          <div className="absolute h-122.5 w-100">
            <img
              src="/image2.png"
              className={`absolute  w-full h-full object-contain transition-all duration-700 ease-in-out
                 ${
                   isSignup
                     ? "left-0 -top-15 rotate-y-0 "
                     : "rotate-y-180 -left-42.5 -top-15"
                 }`}
              alt=""
            />
          </div>
        </div>
      </div>
    </div>
    </form>
  );
};

export default Login;
