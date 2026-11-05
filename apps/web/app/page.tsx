import Link from 'next/link';
import { tryDemo } from '../lib/auth-actions';

export default function Home() {
  return (
    <>
      <h1>xd-memories</h1>
      <p>The movies, series, books and albums you want, are into, and have finished.</p>
      <form action={tryDemo}>
        <button type="submit">Try the demo</button>
      </form>
      <p>
        <Link href="/sign-up">Create an account</Link> or <Link href="/sign-in">sign in</Link>.
      </p>
    </>
  );
}
