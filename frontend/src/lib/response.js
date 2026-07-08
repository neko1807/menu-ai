export async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  const text = await response.text();

  return {
    raw: text,
    message: text.trim() || 'Unexpected non-JSON response from the server.',
  };
}
