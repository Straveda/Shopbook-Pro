// FILE: src/components/TopBar.tsx
// ============================================
// TOPBAR COMPONENT WITH COMBINED HOOKS
// ============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Bell, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { QuickSaleDialog } from "./QuickSaleDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTopBar, useSearch } from "@/hooks/useTopBar";

export function TopBar() {
  const navigate = useNavigate();
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { user, notifications, unreadCount, logout } = useTopBar();
  const { results, search } = useSearch();

  const handleSearch = (value: string) => {
    setSearchValue(value);
    search(value);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleResultClick = (result: any) => {
    if (result.type === 'customer') {
      navigate(`/customers/${result._id}`);
    } else if (result.type === 'sale') {
      navigate(`/sales/${result._id}`);
    } else if (result.type === 'invoice') {
      navigate(`/invoices/${result._id}`);
    }
    setSearchValue("");
  };

  return (
    <>
      <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 gap-4">
        {/* Left Section: Menu & Search */}
        <div className="flex items-center gap-4 flex-1">
          <SidebarTrigger />
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers, invoices..."
              className="pl-10 w-full"
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
            />

            {/* Search Results Dropdown */}
            {searchValue && results.results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {results.results.map((result) => (
                  <div
                    key={`${result.type}-${result._id}`}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="font-medium text-sm">
                      {result.name || result.saleNumber || result.invoiceNo}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {result.type === 'customer' && `Phone: ${result.phone}`}
                      {result.type === 'sale' && `${result.status}`}
                      {result.type === 'invoice' && 'Invoice'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Sale Button */}
          <Button
            size="sm"
            className="gap-2 bg-teal-500 hover:bg-teal-600"
            onClick={() => setQuickSaleOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Quick Sale
          </Button>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <DropdownMenuLabel className="text-base">
                Notifications ({unreadCount})
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex flex-col gap-1 py-3 px-4 focus:bg-gray-50 dark:focus:bg-slate-800 cursor-default"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{notification.title}</div>
                      {notification.count > 0 && (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-medium">
                          {notification.count}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {notification.message}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</span>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                <span>Profile Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Quick Sale Dialog */}
      <QuickSaleDialog open={quickSaleOpen} onOpenChange={setQuickSaleOpen} />
    </>
  );
}