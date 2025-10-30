import React, { useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "./Form";
import { Input } from "./Input";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import styles from "./PasswordLoginForm.module.css";
import {
  schema,
  postLogin,
} from "../endpoints/auth/login_with_password_POST.schema";
import { useAuth } from "../helpers/useAuth";

export type LoginFormData = z.infer<typeof schema>;

interface PasswordLoginFormProps {
  className?: string;
}

export const PasswordLoginForm: React.FC<PasswordLoginFormProps> = ({
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { onLogin } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    schema,
  });

  const handleSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await postLogin(data);
      onLogin(result.user);
      
      // Redirect based on user role
      const redirectPath = 
        result.user.role === "partner" ? "/dashboard/partner" :
        result.user.role === "admin" ? "/dashboard/admin" :
        "/";
      
      setTimeout(() => navigate(redirectPath), 200);
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={`${styles.form} ${className || ""}`}
      >
        {error && <div className={styles.errorMessage}>{error}</div>}

        <FormItem name="email">
          <FormLabel>Email</FormLabel>
          <FormControl>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <Input
                placeholder="your@email.com"
                type="email"
                autoComplete="email"
                autoFocus
                disabled={isLoading}
                value={form.values.email}
                onChange={(e) =>
                  form.setValues((prev) => ({ ...prev, email: e.target.value }))
                }
                className={styles.inputWithIcon}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>

        <FormItem name="password">
          <FormLabel>Password</FormLabel>
          <FormControl>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                value={form.values.password}
                onChange={(e) =>
                  form.setValues((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className={styles.inputWithIcon}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.toggleButton}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>

        <Button
          type="submit"
          disabled={isLoading}
          className={styles.submitButton}
        >
          {isLoading ? (
            <span className={styles.loadingText}>
              <Spinner className={styles.spinner} size="sm" />
              Logging in...
            </span>
          ) : (
            "Log In"
          )}
        </Button>
      </form>
    </Form>
  );
};