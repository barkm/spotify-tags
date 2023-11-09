export function generateURLWithSearchParams(
  url: string,
  params: { [index: string]: string }
): string {
  const urlObject = new URL(url);
  urlObject.search = new URLSearchParams(params).toString();
  return urlObject.toString();
}
