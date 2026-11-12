/** Logo text. A single ampersand keeps the existing italic accent. */
export function BrandWord({ name }: { name: string }) {
  const parts = name.split('&');
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return (
      <>
        {parts[0].trim()}
        <span>&</span>
        {parts[1].trim()}
      </>
    );
  }
  return name;
}
