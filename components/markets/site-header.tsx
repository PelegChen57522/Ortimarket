"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export function SiteHeader({ searchValue = "", onSearchChange }: SiteHeaderProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalQuery, setInternalQuery] = useState(searchValue);

  useEffect(() => {
    setInternalQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const query = onSearchChange ? searchValue : internalQuery;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 lg:px-6">
        <div className="flex min-w-[168px] items-center gap-4">
          <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
            OrtiMarket
          </Link>
          <nav className="hidden items-center gap-2 text-sm sm:flex">
            <Link
              href="/"
              className={cn(
                "rounded-md px-2.5 py-1.5 transition-colors",
                pathname === "/" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              Browse
            </Link>
            <Link
              href="/me"
              className={cn(
                "rounded-md px-2.5 py-1.5 transition-colors",
                pathname === "/me" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              Portfolio
            </Link>
          </nav>
        </div>

        <div className="relative mx-auto hidden w-full max-w-[560px] flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              if (onSearchChange) {
                onSearchChange(value);
              } else {
                setInternalQuery(value);
              }
            }}
            placeholder="Search markets"
            className="h-9 rounded-full border-border bg-card pl-9 pr-12 text-sm"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            /
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button className="h-9 rounded-full bg-foreground px-4 text-background hover:bg-foreground/90">
            Connect
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-9 w-9 border border-border/80">
                  <AvatarFallback className="bg-secondary text-xs font-medium">OP</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Wallet</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Disconnect</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-3 md:hidden lg:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              if (onSearchChange) {
                onSearchChange(value);
              } else {
                setInternalQuery(value);
              }
            }}
            placeholder="Search markets"
            className="h-9 rounded-full border-border bg-card pl-9 text-sm"
          />
        </div>
      </div>
    </header>
  );
}
