import { signupApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";
import { useActionState } from "react";
import { Link, useNavigate } from "react-router-dom";

type FormState = { error: string } | null;

export function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  async function signupAction(
    _prev: FormState,
    formData: FormData,
  ): Promise<FormState> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      const res = await signupApi(email, password);
      login(res.token, res.user);
      navigate("/");
      return null;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Signup failed" };
    }
  }

  const [state, formAction, isPending] = useActionState(signupAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-indigo-50 via-white to-violet-50" />
      <div className="absolute -top-32 -left-32 w-120 h-120 rounded-full bg-indigo-100/80 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-95 h-95 rounded-full bg-violet-100/80 blur-3xl" />

      <Card className="w-full max-w-sm relative z-10 shadow-xl shadow-violet-100/60 border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">DocChat</CardTitle>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-lg">
                {state.error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
