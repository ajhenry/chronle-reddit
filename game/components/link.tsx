import { useSetPage } from '../hooks/usePage';
import { Page } from '@/shared';

export const Link = ({ href, children }: { href: Page; children: React.ReactNode }) => {
  const setPage = useSetPage();
  const onClick = () => {
    setPage(href);
  };

  return <div onClick={onClick}>{children}</div>;
};
