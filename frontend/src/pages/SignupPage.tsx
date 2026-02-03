import { signupApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { FileText } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <FileText className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">DocChat</CardTitle>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </CardHeader>
        <CardContent>
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
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="underline text-foreground">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
