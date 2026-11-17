'use client';

import type { MediaType } from '@xd-memories/domain';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { mediaLinks, mediaOfPath } from './media-links';

function MediaList({ current, query }: { current: MediaType | null; query: string | null }) {
  return (
    <nav aria-label="Media" className="sidebar-media">
      <p className="sidebar-label">Browse</p>
      <ul>
        {mediaLinks(current, query).map(({ href, label, current: isCurrent }) => (
          <li key={href}>
            <Link href={href} aria-current={isCurrent ? 'page' : undefined}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// On a catalog page, the current media is marked and switching keeps the search.
function CurrentMediaList() {
  const pathname = usePathname();
  const q = useSearchParams().get('q')?.trim() || null;
  const current = mediaOfPath(pathname);

  return <MediaList current={current} query={current === null ? null : q} />;
}

// The wide screen's media list, in place of Browse (CSS hides it on a phone, where the catalog
// shows its own chips). Reading the query needs Suspense; until then the plain links stand in.
export function SidebarMedia() {
  return (
    <Suspense fallback={<MediaList current={null} query={null} />}>
      <CurrentMediaList />
    </Suspense>
  );
}
