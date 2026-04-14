import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePortfolios() {
  const { data, error, isLoading, mutate } = useSWR('/api/portfolios', fetcher);
  return { portfolios: data ?? [], error, isLoading, mutate };
}

export function usePortfolio(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/portfolios/${id}` : null,
    fetcher
  );
  return { portfolio: data, error, isLoading, mutate };
}

export function useDraft(portfolioId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    portfolioId ? `/api/portfolios/${portfolioId}/draft` : null,
    fetcher
  );
  return { draft: data, error, isLoading, mutate };
}

export function useVersions(portfolioId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    portfolioId ? `/api/portfolios/${portfolioId}/versions` : null,
    fetcher
  );
  return { versions: data ?? [], error, isLoading, mutate };
}

export function useAssetSearch(query: string) {
  const { data, error, isLoading } = useSWR(
    query.length >= 1 ? `/api/assets/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    { dedupingInterval: 300 }
  );
  return { results: data ?? [], error, isLoading };
}

export function useQuote(symbol: string | null) {
  const { data, error, isLoading } = useSWR(
    symbol ? `/api/assets/${symbol}` : null,
    fetcher,
    { refreshInterval: 300_000 }
  );
  return { quote: data, error, isLoading };
}
