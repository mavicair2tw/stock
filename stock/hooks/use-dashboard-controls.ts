"use client";

import { useMemo, useState } from 'react';

export function useDashboardControls() {
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  return {
    search,
    setSearch,
    normalizedSearch,
    autoRefresh,
    setAutoRefresh,
  };
}
