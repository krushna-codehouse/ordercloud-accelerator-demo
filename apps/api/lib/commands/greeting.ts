export function getGreeting(name?: string | null): { greeting: string } {
  return { greeting: `Hello ${name ?? 'world'}!` }
}
