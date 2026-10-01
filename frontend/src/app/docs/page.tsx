import type { Metadata } from 'next';
import { DocsPage } from '@/components/docs/DocsPage';

export const metadata: Metadata = {
  title: 'Documentation & Guides | Eunoia Architecture Whiteboard',
  description:
    'Comprehensive documentation for Eunoia: D2 declarative syntax cheatsheet, canvas keyboard shortcuts, Dagre vs ELK vs TALA layout engines, and Docker self-hosting guide.',
  openGraph: {
    title: 'Eunoia Documentation & Guides',
    description:
      'Learn D2 syntax, canvas keyboard shortcuts, layout engine trade-offs, and self-hosting with Docker Compose.',
  },
};

export default function DocsRoute() {
  return <DocsPage />;
}
