import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Menu, LogOut, Settings, FileText, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface HeaderProps {
  onSidebarToggle: () => void;
}

export const Header = ({ onSidebarToggle }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { searchTerm, setSearchTerm, searchResults, isSearching, performSearch, clearSearch } = useSearch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (inputValue.trim()) {
        performSearch(inputValue);
        setSearchTerm(inputValue);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [inputValue, performSearch, clearSearch, setSearchTerm]);

  const handleSelectResult = (estimation: any) => {
    setOpen(false);
    setInputValue('');
    clearSearch();
    navigate('/estimations');
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Search */}
          <div className="relative hidden md:block">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search estimations, proposals..."
                    className="pl-10 w-80 bg-surface-elevated border-border/50"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setOpen(true)}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandList>
                    {isSearching && (
                      <div className="p-4 text-sm text-muted-foreground">Searching...</div>
                    )}
                    {!isSearching && inputValue && searchResults.length === 0 && (
                      <CommandEmpty>No results found.</CommandEmpty>
                    )}
                    {!isSearching && searchResults.length > 0 && (
                      <CommandGroup heading="Estimations">
                        {searchResults.slice(0, 8).map((estimation: any) => (
                          <CommandItem
                            key={estimation.id}
                            onSelect={() => handleSelectResult(estimation)}
                            className="flex items-center gap-2 p-3"
                          >
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium">{estimation.title}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Building2 className="w-3 h-3" />
                                <span>{estimation.client_name}</span>
                                <span className="px-2 py-0.5 bg-muted rounded text-xs">
                                  {estimation.status}
                                </span>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={undefined} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{(user?.name || "U").slice(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || ""}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};