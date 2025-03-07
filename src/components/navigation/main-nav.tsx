"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  Menu, X, Home, MessageSquare, Settings, LogOut, 
  Layers, Key, Code, FileText, ChevronRight, ChevronLeft 
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardShell } from "../dashboard/dashboard-shell";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  requireAuth?: boolean;
  isDashboardItem?: boolean;
}

interface MainNavProps {
  children?: React.ReactNode;
}

export function MainNav({ children }: MainNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const { toast } = useToast();
  
  const isAuthenticated = status === "authenticated";
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/chat') || 
                          pathname.startsWith('/settings') || 
                          pathname.startsWith('/integrations') ||
                          pathname.startsWith('/api-tokens') ||
                          pathname.startsWith('/chat-templates');
  
  // Redirect unauthenticated users from dashboard routes to login
  useEffect(() => {
    if (isDashboardRoute && status === "unauthenticated") {
      console.log("Redirecting unauthenticated user from protected route:", pathname);
      const callbackUrl = encodeURIComponent(pathname);
      router.push(`/auth/login?callbackUrl=${callbackUrl}`);
    }
  }, [isDashboardRoute, status, pathname, router]);
  
  // Set sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
      isDashboardItem: true,
    },
    {
      title: "Chat",
      href: "/chat",
      icon: <MessageSquare className="h-5 w-5" />,
      requireAuth: true,
      isDashboardItem: true,
    },
    {
      title: "Chat Templates",
      href: "/chat-templates",
      icon: <FileText className="h-5 w-5" />,
      requireAuth: true,
      isDashboardItem: true,
    },
    {
      title: "Function Calling",
      href: "/chat/functions",
      icon: <Code className="h-5 w-5" />,
      requireAuth: true,
      isDashboardItem: true,
    },
    {
      title: "Integrations",
      href: "/integrations",
      icon: <Layers className="h-5 w-5" />,
      requireAuth: true,
      isDashboardItem: true,
    },
    {
      title: "Slack",
      href: "/integrations/slack",
      icon: <MessageSquare className="h-5 w-5" />,
      requireAuth: true,
      isDashboardItem: true,
    },
    {
      title: "API Tokens",
      href: "/api-tokens",
      icon: <Key className="h-5 w-5" />,
      requireAuth: true,
      isDashboardItem: true,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      requireAuth: true,
      isDashboardItem: true,
    },
  ];
  
  // Filter nav items based on authentication status
  const filteredNavItems = navItems.filter(
    (item) => !item.requireAuth || isAuthenticated
  );
  
  // Separate dashboard items for the sidebar
  const dashboardItems = filteredNavItems.filter(item => item.isDashboardItem);
  
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      
      // Redirect to home page after sign out
      router.push('/');
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out. Please try again.",
      });
    }
  };
  
  // Show loading state while checking authentication
  if (isDashboardRoute && status === "loading") {
    return (
      <div className="flex flex-col h-screen">
        {/* Top navigation skeleton */}
        <div className="border-b bg-background z-10">
          <div className="w-full flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">Nuco</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </div>
        
        {/* Main content with sidebar skeleton */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar skeleton */}
          <div className="border-r bg-background w-64 py-4">
            <div className="space-y-2 px-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="h-10 rounded-md"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
          
          {/* Main content skeleton */}
          <div className="flex-1 p-6">
            <div className="flex flex-col space-y-6 h-full">
              <Skeleton className="h-12 w-48 rounded-md" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton 
                    key={i} 
                    className="h-40 rounded-lg"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <Skeleton className="h-64 w-full rounded-lg mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Redirect unauthenticated users from dashboard routes
  if (isDashboardRoute && !isAuthenticated && status !== "loading") {
    // This is a fallback in case the useEffect redirect doesn't work
    // It will render nothing briefly before the router.push in useEffect takes effect
    return null;
  }
  
  // Render sidebar for dashboard routes
  if (isDashboardRoute && isAuthenticated) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Top navigation bar */}
        <nav className="border-b bg-background z-10">
          <div className="w-full flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold">Nuco</span>
              </Link>
            </div>
            
            {/* Desktop Navigation - only show non-dashboard items */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <ThemeToggle />
              
              <Button
                variant="ghost"
                className="flex items-center space-x-1"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </Button>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-2">
              <ThemeToggle />
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
                {dashboardItems.map((item) => (
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
              </div>
            </div>
          )}
        </nav>
        
        {/* Main content with sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={cn(
              "border-r bg-background transition-all duration-300 ease-in-out",
              sidebarCollapsed ? "w-16" : "w-64"
            )}
          >
            <div className="flex flex-col h-full py-4">
              <div className="px-3 mb-2 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="h-8 w-8"
                >
                  {sidebarCollapsed ? 
                    <ChevronRight className="h-4 w-4" /> : 
                    <ChevronLeft className="h-4 w-4" />
                  }
                </Button>
              </div>
              
              <div className="space-y-1 px-3">
                {dashboardItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground",
                      sidebarCollapsed ? "justify-center" : "justify-start"
                    )}
                  >
                    <div className={sidebarCollapsed ? "mx-auto" : ""}>
                      {item.icon}
                    </div>
                    {!sidebarCollapsed && <span className="ml-2">{item.title}</span>}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
          
          {/* Main content */}
          <div className="flex-1 transition-all duration-300 ease-in-out">
            <main className="md:pl-0">
              <DashboardShell>  
                {children}
              </DashboardShell>
            </main>
          </div>
        </div>
      </div>
    );
  }
  
  // Regular navigation for non-dashboard routes
  return (
    <>
      <nav className="border-b bg-background">
        <div className="w-full flex items-center justify-between px-4 py-3">
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
            
            <ThemeToggle />
            
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
          <div className="flex md:hidden items-center space-x-2">
            <ThemeToggle />
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
      {children}
    </>
  );
} 