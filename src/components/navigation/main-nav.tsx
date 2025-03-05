"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Home, MessageSquare, Settings, LogOut, Layers, Key, Code, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  requireAuth?: boolean;
}

export function MainNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { status } = useSession();
  const { toast } = useToast();
  
  const isAuthenticated = status === "authenticated";
  
  const navItems: NavItem[] = [
    {
      title: "Home",
      href: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
      requireAuth: true,
    },
    {
      title: "Chat",
      href: "/chat",
      icon: <MessageSquare className="h-5 w-5" />,
      requireAuth: true,
    },
    {
      title: "ChatTemplates",
      href: "/chat-templates",
      icon: <FileText className="h-5 w-5" />,
      requireAuth: true,
    },
    {
      title: "Function Calling",
      href: "/chat/functions",
      icon: <Code className="h-5 w-5" />,
      requireAuth: true,
    },
    {
      title: "Integrations",
      href: "/integrations",
      icon: <Layers className="h-5 w-5" />,
      requireAuth: true,
    },
    {
      title: "Slack",
      href: "/integrations/slack",
      icon: <MessageSquare className="h-5 w-5" />,
      requireAuth: true,
    },
    {
      title: "API Tokens",
      href: "/settings/api-tokens",
      icon: <Key className="h-5 w-5" />,
      requireAuth: true,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      requireAuth: true,
    },
  ];
  
  // Filter nav items based on authentication status
  const filteredNavItems = navItems.filter(
    (item) => !item.requireAuth || isAuthenticated
  );
  
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out. Please try again.",
      });
    }
  };
  
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Nuco</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-4">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span>{item.title}</span>
            </Link>
          ))}
          
          {isAuthenticated ? (
            <Button
              variant="ghost"
              className="flex items-center space-x-1"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <Button asChild variant="ghost">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
        
        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isOpen && (
        <div className="container mx-auto px-4 py-4 md:hidden">
          <div className="flex flex-col space-y-3">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ))}
            
            {isAuthenticated ? (
              <Button
                variant="ghost"
                className="flex items-center justify-start space-x-2"
                onClick={() => {
                  handleSignOut();
                  setIsOpen(false);
                }}
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </Button>
            ) : (
              <div className="flex flex-col space-y-2">
                <Button asChild variant="ghost">
                  <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup" onClick={() => setIsOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 