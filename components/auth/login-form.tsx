"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  users: string[];
};

export function LoginForm({ users }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Login failed.");
      }

      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/80 shadow-card">
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm text-muted-foreground">
              Username
            </label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              required
              list="allowed-users"
              autoComplete="username"
            />
            <datalist id="allowed-users">
              {users.map((user) => (
                <option key={user} value={user} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-muted-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="h-11 w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">Only approved users can access potymarket.</p>
        </form>
      </CardContent>
    </Card>
  );
}
