// Stub for the `react` import that some catalog helper files reference
// only in type positions. We never call React at runtime, so this empty
// module lets esbuild resolve the bare `react` specifier without pulling
// React into the bundle.
export type MutableRefObject<T> = { current: T | null }
export default {}
