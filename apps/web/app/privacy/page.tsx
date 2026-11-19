import Link from 'next/link';

// What the app keeps and who sees it. Keep it true: change it with the code it describes.
export default function PrivacyPage() {
  return (
    <article className="prose">
      <h1>Privacy</h1>
      <p>
        xd-memories is a small, non-commercial app. It keeps what it needs to show you your library,
        and nothing to sell or advertise with: no analytics, no tracking, no ads.
      </p>

      <h2>What is stored</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name, your email address, and your password, stored
          hashed (never as you typed it).
        </li>
        <li>
          <strong>Your sessions:</strong> while you're signed in, the IP address and browser you
          signed in from, so a session can be told apart from another.
        </li>
        <li>
          <strong>Your library:</strong> each status you gave a work and when, your ratings, the
          season you've reached in a series, and your highlights.
        </li>
        <li>
          <strong>Two cookies:</strong> one keeps you signed in; the other remembers light or dark
          mode, if you chose one.
        </li>
      </ul>
      <p>
        The works themselves (titles, creators, years, covers) form a catalog shared by everyone.
        They come from TMDB, Open Library and MusicBrainz, and say nothing about who added them.
      </p>

      <h2>Who sees what</h2>
      <ul>
        <li>
          <strong>Your highlights:</strong> any signed-in user who opens your highlights page. It
          shows the works, never your name or email address.
        </li>
        <li>
          <strong>Everything else:</strong> no one but you. The database itself only lets a request
          read the signed-in user's own library.
        </li>
        <li>
          <strong>The demo:</strong> one account shared by everyone who tries it, and read-only.
        </li>
      </ul>

      <h2>Who else handles it</h2>
      <ul>
        <li>The app runs on Vercel, and the database is hosted by Neon.</li>
        <li>
          The emails that confirm your address or reset your password are sent through Gmail. They
          carry the link and nothing else.
        </li>
        <li>
          Searches go to TMDB, Open Library or MusicBrainz from the app's server, without your
          account.
        </li>
        <li>
          Covers load straight from those sources' image hosts (image.tmdb.org,
          covers.openlibrary.org, coverartarchive.org), so they see your IP address, but not which
          page you came from.
        </li>
      </ul>

      <h2>Deleting your account</h2>
      <p>
        On your <Link href="/account">Account</Link> page, with your password. It deletes your
        account, your sessions and your whole library at once, and can't be undone. Works you added
        stay in the shared catalog, without your name. The database host keeps a short restore
        history, after which nothing of yours is left.
      </p>
    </article>
  );
}
