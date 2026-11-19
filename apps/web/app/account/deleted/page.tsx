import Link from 'next/link';

export default function AccountDeletedPage() {
  return (
    <>
      <h1>Your account is deleted</h1>
      <p>Your library went with it. Thanks for trying xd-memories.</p>
      <p>
        <Link href="/">Back to the start</Link>
      </p>
    </>
  );
}
