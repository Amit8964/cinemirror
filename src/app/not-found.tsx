import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center px-6 py-28 text-center">
      <div>
        <p className="font-display text-8xl leading-none text-accent">404</p>
        <h1 className="mt-2 font-display text-4xl tracking-wide">This reel is missing</h1>
        <p className="mt-2 text-muted">The page you are looking for does not exist or was removed.</p>
        <Link href="/" className="btn btn-primary mt-6">Back to home</Link>
      </div>
    </main>
  );
}
