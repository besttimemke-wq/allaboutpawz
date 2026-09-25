'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useQuickActionPalette } from '@/providers/QuickActionProvider';
import { useQuickActions } from '@/hooks/useQuickActions';
import { QUICK_ACTIONS, DOMAIN_LABELS, type QuickActionDomain } from '@/config/quickActionRegistry';
import { quickActionService } from '@/services/quickActionService';
import { Search, ArrowRight } from 'lucide-react';

export function GlobalCommandPalette() {
  const { isOpen, close } = useQuickActionPalette();
  const router = useRouter();
  const { execute } = useQuickActions();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Debounced global search
  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await quickActionService.globalSearch(search);
        setSearchResults(data.results || []);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredActions = useMemo(() => {
    if (!search.trim()) return QUICK_ACTIONS;
    const q = search.toLowerCase();
    return QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(q) || a.domain.includes(q) || a.subCategory?.toLowerCase().includes(q));
  }, [search]);

  // Group by domain
  const grouped = useMemo(() => {
    const groups: Record<string, typeof QUICK_ACTIONS> = {};
    for (const action of filteredActions) {
      (groups[action.domain] ||= []).push(action);
    }
    return groups;
  }, [filteredActions]);

  const handleAction = (action: typeof QUICK_ACTIONS[0]) => {
    close();
    if (action.actionType === 'route' && action.targetPath) {
      router.push(action.targetPath);
    } else if (action.actionType === 'mutation' && action.mutationKey) {
      const [domain] = (action.mutationKey || '').split(':');
      execute({ domain, action: action.id.replace(/-/g, '_'), payload: {} });
    }
  };

  const handleSearchResult = (result: any) => {
    close();
    if (result.type === 'customer') router.push(`/admin/customers`);
    else if (result.type === 'appointment') router.push(`/admin/appointments`);
    else if (result.type === 'order') router.push(`/admin/orders`);
    else if (result.type === 'pet') router.push(`/admin/pets`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50" onClick={close}>
      <div className="w-full max-w-xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <Command shouldFilter={false} className="rounded-xl">
          <div className="flex items-center gap-2 px-3 border-b border-border">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <CommandInput placeholder="Search actions, customers, pets, orders…" value={search} onValueChange={setSearch} className="flex-1 h-11" />
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
          </div>
          <CommandList className="max-h-[50vh] overflow-y-auto">
            <CommandEmpty>No results found.</CommandEmpty>
            {searchResults.length > 0 && (
              <CommandGroup heading="Search Results">
                {searchResults.map((r: any) => (
                  <CommandItem key={`${r.type}-${r.id}`} value={`${r.type}-${r.id}`} onSelect={() => handleSearchResult(r)} className="gap-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground w-16">{r.type}</span>
                    <span className="font-medium text-[13px]">{r.label}</span>
                    {r.sub && <span className="text-[11px] text-muted-foreground">{r.sub}</span>}
                  </CommandItem>
                ))}
                <CommandSeparator />
              </CommandGroup>
            )}
            {Object.entries(grouped).map(([domain, actions]) => actions.length > 0 && (
              <CommandGroup key={domain} heading={DOMAIN_LABELS[domain as QuickActionDomain] || domain}>
                {actions.map(action => (
                  <CommandItem key={action.id} value={action.id} onSelect={() => handleAction(action)} className="gap-2">
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[13px]">{action.label}</span>
                    {action.subCategory && <span className="text-[10px] text-muted-foreground">{action.subCategory}</span>}
                    {action.shortcut && <kbd className="ml-auto text-[9px] text-muted-foreground">{action.shortcut.join(' ')}</kbd>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
