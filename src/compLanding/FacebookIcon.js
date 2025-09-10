export default function FacebookIcon({ url }) {
  return (
    <a
      href={url}
      className="facebook-float"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="פתח עמוד פייסבוק"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.7V12h2.7V9.7c0-2.7 1.6-4.1 4-4.1 1.2 0 2.4.2 2.4.2v2.6h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12Z"/>
      </svg>
    </a>
  );
}
